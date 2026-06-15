import { NextResponse } from 'next/server'

const MAX_BYTES = 20_000 // ~20 KB — keeps context size manageable

// Block private/loopback ranges to prevent SSRF
function isPrivateUrl(url) {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'localhost' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    )
  } catch {
    return true
  }
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

  if (isPrivateUrl(url)) {
    return NextResponse.json({ error: 'Private/loopback URLs are not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TiloPortfolioBot/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    const contentType = res.headers.get('content-type') || 'text/plain'
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer).slice(0, MAX_BYTES)
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
