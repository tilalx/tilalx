import { useCallback, useEffect, useRef, useState } from 'react'
import { stripQuotes, parseTags, pickMemeUrl } from './utils'
import type { Commit, Meme, NetworkEntry, Quote, TabKind } from './types'

interface FeedsInit {
  initialMemes:   Meme[]
  initialQuotes:  Quote[]
  initialCommits: Commit[]
  activeTab:      TabKind
}

export function useFeeds({ initialMemes, initialQuotes, initialCommits, activeTab }: FeedsInit) {
  const seenMemeUrls    = useRef(new Set(initialMemes.map(m => m.url)))
  const memeQueue       = useRef(initialMemes.slice(1))
  const quoteQueue      = useRef(initialQuotes.slice(1))
  const preloadedUrlRef = useRef('')

  const [memeUrl,       setMemeUrl]       = useState(initialMemes[0]?.url  || '')
  const [memeThumbUrl,  setMemeThumbUrl]  = useState(initialMemes[0]?.thumb || '')
  const [memeLoading,   setMemeLoading]   = useState(initialMemes.length === 0)
  const [memeTabViewed, setMemeTabViewed] = useState(false)

  const [quote,        setQuote]        = useState<Quote | null>(initialQuotes[0] || null)
  const [quoteLoading, setQuoteLoading] = useState(initialQuotes.length === 0)

  const [commits,        setCommits]        = useState(initialCommits)
  const [commitsLoading, setCommitsLoading] = useState(false)
  const [commitsFetched, setCommitsFetched] = useState(initialCommits.length > 0)

  const [networkLog, setNetworkLog] = useState<NetworkEntry[]>([])
  const addLog = useCallback((url: string, ok: boolean, ms: number) => {
    setNetworkLog(prev => [{ url, ok, ms }, ...prev].slice(0, 50))
  }, [])

  const preloadNextMeme = useCallback(() => {
    const next = memeQueue.current[0]?.url
    if (next && next !== preloadedUrlRef.current) {
      preloadedUrlRef.current = next
      const img = new window.Image()
      img.src = next
    }
  }, [])

  const refillMemeQueue = useCallback(async () => {
    try {
      const res   = await fetch('https://meme-api.aelx.de/gimme/10')
      const data  = await res.json()
      const items: Meme[] = ((data.memes || []) as { url?: string; preview?: string[] }[])
        .filter((m): m is { url: string; preview?: string[] } => !!m.url && !seenMemeUrls.current.has(m.url))
        .map(m => ({ url: m.url, thumb: pickMemeUrl(m.preview, m.url) }))
      items.forEach(({ url }) => {
        seenMemeUrls.current.add(url)
        if (seenMemeUrls.current.size > 100)
          seenMemeUrls.current.delete(seenMemeUrls.current.values().next().value!)
      })
      memeQueue.current = [...memeQueue.current, ...items]
      preloadNextMeme()
    } catch {}
  }, [preloadNextMeme])

  const refillQuoteQueue = useCallback(async () => {
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=10', { cache: 'no-store' })
      const data = await res.json()
      quoteQueue.current = [
        ...quoteQueue.current,
        ...((data || []) as { content: string; author: string; tags: string }[]).map(q => ({ content: stripQuotes(q.content), author: q.author, tags: parseTags(q.tags) })),
      ]
    } catch {}
  }, [])

  const fetchMeme = useCallback(async () => {
    if (memeQueue.current.length < 3) refillMemeQueue()
    const queued = memeQueue.current.shift()
    preloadNextMeme()
    if (queued) {
      setMemeUrl(queued.url)
      setMemeThumbUrl(queued.thumb)
      addLog('meme-api.aelx.de/gimme', true, 0)
      return
    }
    setMemeLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://meme-api.aelx.de/gimme')
      const data = await res.json()
      const url  = data.url || ''
      if (url) {
        setMemeUrl(url)
        setMemeThumbUrl(pickMemeUrl(data.preview, url))
        addLog('meme-api.aelx.de/gimme', true, Date.now() - t)
      } else addLog('meme-api.aelx.de/gimme', false, Date.now() - t)
    } catch {
      setMemeUrl('')
      addLog('meme-api.aelx.de/gimme', false, Date.now() - t)
    } finally { setMemeLoading(false) }
  }, [addLog, refillMemeQueue, preloadNextMeme])

  const fetchQuote = useCallback(async () => {
    if (quoteQueue.current.length < 3) refillQuoteQueue()
    const queued = quoteQueue.current.shift()
    if (queued) {
      setQuote(queued)
      addLog('quotes.aelx.de/random', true, 0)
      return
    }
    setQuoteLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
      const data = await res.json()
      if (data?.length > 0) {
        setQuote({ content: stripQuotes(data[0].content), author: data[0].author, tags: parseTags(data[0].tags) })
        addLog('quotes.aelx.de/random', true, Date.now() - t)
      }
    } catch {
      addLog('quotes.aelx.de/random', false, Date.now() - t)
    } finally { setQuoteLoading(false) }
  }, [addLog, refillQuoteQueue])

  const fetchCommits = async () => {
    if (commitsFetched) return
    setCommitsLoading(true)
    setCommitsFetched(true)
    try {
      const res = await fetch('https://api.github.com/repos/tilalx/tilalx/commits?per_page=15')
      const data = await res.json()
      setCommits(Array.isArray(data) ? data : [])
    } catch {
      setCommits([])
    } finally {
      setCommitsLoading(false)
    }
  }

  useEffect(() => {
    if (initialMemes.length === 0) fetchMeme()
    else if (memeQueue.current.length < 3) refillMemeQueue()
    if (initialQuotes.length === 0) fetchQuote()
    else if (quoteQueue.current.length < 3) refillQuoteQueue()
    fetchCommits()
  }, [])

  useEffect(() => { if (activeTab === 'memes') setMemeTabViewed(true) }, [activeTab])
  const previewMemeUrl = memeTabViewed ? memeUrl : memeThumbUrl

  return {
    memeUrl, previewMemeUrl, memeLoading, fetchMeme,
    quote, quoteLoading, fetchQuote,
    commits, commitsLoading, fetchCommits,
    networkLog,
  }
}
