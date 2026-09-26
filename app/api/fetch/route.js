import { NextResponse } from 'next/server'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 20_000 // ~20 KB — keeps context size manageable

const MAX_REDIRECTS = 3

// Block private/loopback/link-local/metadata ranges to prevent SSRF. Checked on
// the *resolved* addresses, so hostnames pointing at internal IPs are caught too.
function isPrivateIp(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    // IPv4-mapped, dotted (::ffff:127.0.0.1) or as URL normalizes it (::ffff:7f00:1)
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v)
    if (mapped) return isPrivateIp(mapped[1])
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v)
    if (hex) {
      const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16)
      return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return !/^[23][0-9a-f]{0,3}:/.test(v) // only global unicast 2000::/3 is public
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) ||              // link-local incl. cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)       // CGNAT
}

// ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the resolved IP
// with a custom undici dispatcher if this endpoint ever matters more.
async function isAllowedUrl(raw) {
  let url
  try { url = new URL(raw) } catch { return false }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.replace(/^\[|\]$/g, '')
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
    return addrs.length > 0 && !addrs.some(a => isPrivateIp(a.address))
  } catch { return false }
}

async function readCapped(res) {
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value); total += value.length
  }
  reader.cancel().catch(() => {})
  const out = new Uint8Array(Math.min(total, MAX_BYTES))
  let off = 0
  for (const c of chunks) { const n = Math.min(c.length, out.length - off); out.set(c.subarray(0, n), off); off += n; if (off >= out.length) break }
  return out
}

export async function POST(request) {
  let url
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

  if (!(await isAllowedUrl(url))) {
    return NextResponse.json({ error: 'Private/loopback URLs are not allowed' }, { status: 403 })
  }

  try {
    // Follow redirects by hand so every hop is re-checked against the blocklist.
    let res
    for (let hop = 0; ; hop++) {
      res = await fetch(url, {
        headers: { 'User-Agent': 'TiloPortfolioBot/1.0' },
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      })
      const loc = res.status >= 300 && res.status < 400 && res.headers.get('location')
      if (!loc) break
      if (hop >= MAX_REDIRECTS) return NextResponse.json({ error: 'Too many redirects' }, { status: 502 })
      url = new URL(loc, url).toString()
      if (!(await isAllowedUrl(url))) {
        return NextResponse.json({ error: 'Redirect to a private/loopback URL is not allowed' }, { status: 403 })
      }
    }

    const contentType = res.headers.get('content-type') || 'text/plain'
    const bytes = await readCapped(res)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)

    // Strip HTML tags for cleaner LLM context when fetching webpages
    const cleanText = contentType.includes('text/html')
      ? text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
           .replace(/<[^>]+>/g, ' ')
           .replace(/\s{2,}/g, ' ')
           .trim()
      : text

    return NextResponse.json({ text: cleanText, status: res.status, contentType })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Fetch failed' }, { status: 502 })
  }
}
