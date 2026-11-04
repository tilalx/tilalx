import { NextResponse } from 'next/server'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { isIP, type LookupFunction } from 'node:net'

const MAX_BYTES = 20_000
const MAX_REDIRECTS = 3

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
    if (mapped) return isPrivateIp(mapped[1])
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v)
    if (hex) {
      const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16)
      return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return !/^[23][0-9a-f]{0,3}:/.test(v) || v.startsWith('2002:') || /^2001:0{0,4}:/.test(v)
  }
  const [a, b, c] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 100 && b >= 64 && b <= 127)
}

const safeLookup: LookupFunction = (host, opts, cb) => {
  dns.lookup(host, { ...opts, all: true }, (err, addrs) => {
    if (err) return cb(err, '', 0)
    if (!addrs.length || addrs.some(x => isPrivateIp(x.address))) {
      return cb(Object.assign(new Error('Private/loopback URLs are not allowed'), { code: 'EPRIVATE' }), '', 0)
    }
    if (opts.all) return cb(null, addrs)
    cb(null, addrs[0].address, addrs[0].family)
  })
}

function isAllowedUrl(raw: string): boolean {
  let url: URL
  try { url = new URL(raw) } catch { return false }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.replace(/^\[|\]$/g, '')
  return !isIP(host) || !isPrivateIp(host)
}

interface Fetched { status: number; headers: http.IncomingHttpHeaders; body: Buffer }

function get(url: string, signal: AbortSignal): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': 'TiloPortfolioBot/1.0' }, lookup: safeLookup, signal }, res => {
      const status = res.statusCode ?? 0
      if (status >= 300 && status < 400) {
        res.resume()
        return resolve({ status, headers: res.headers, body: Buffer.alloc(0) })
      }
      const chunks: Buffer[] = []
      let total = 0
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        total += chunk.length
        if (total >= MAX_BYTES) {
          res.destroy()
          resolve({ status, headers: res.headers, body: Buffer.concat(chunks).subarray(0, MAX_BYTES) })
        }
      })
      res.on('end', () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }))
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body?.url
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: 'Private/loopback URLs are not allowed' }, { status: 403 })
  }

  const signal = AbortSignal.timeout(8000)
  try {
    let res: Fetched
    for (let hop = 0; ; hop++) {
      res = await get(url, signal)
      const loc = res.status >= 300 && res.status < 400 ? res.headers.location : undefined
      if (!loc) break
      if (hop >= MAX_REDIRECTS) return NextResponse.json({ error: 'Too many redirects' }, { status: 502 })
      url = new URL(loc, url).toString()
      if (!isAllowedUrl(url)) {
        return NextResponse.json({ error: 'Redirect to a private/loopback URL is not allowed' }, { status: 403 })
      }
    }

    const contentType = res.headers['content-type'] || 'text/plain'
    const text = new TextDecoder('utf-8', { fatal: false }).decode(res.body)

    const cleanText = contentType.includes('text/html')
      ? text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
           .replace(/<[^>]+>/g, ' ')
           .replace(/<[^>]*$/, '')
           .replace(/\s{2,}/g, ' ')
           .trim()
      : text

    return NextResponse.json({ text: cleanText, status: res.status, contentType })
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'EPRIVATE') return NextResponse.json({ error: err.message }, { status: 403 })
    return NextResponse.json({ error: err.name === 'AbortError' || err.name === 'TimeoutError' ? 'Request timed out' : err.message || 'Fetch failed' }, { status: 502 })
  }
}
