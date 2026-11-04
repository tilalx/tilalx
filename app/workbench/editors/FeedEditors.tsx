'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkbench } from '../context'
import { Codicon } from '../icons'
import { MEME_SUBREDDITS } from '../paths'
import type { Meme, Quote } from '../types'


function FeedToolbar({ title, busy, onRefresh, children }: { title: string; busy: boolean; onRefresh(): void; children?: React.ReactNode }) {
  return (
    <div className="feed-toolbar">
      <span className="feed-title">{title}</span>
      {children}
      <button className="action-label" title="Refresh" onClick={onRefresh} disabled={busy}>
        <Codicon name="refresh" className={busy ? 'codicon-modifier-spin' : ''} />
      </button>
    </div>
  )
}

function useFeed<T>(initial: T[], url: string, map: (json: unknown) => T[]) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy]   = useState(false)
  const [fetchedAt, setFetchedAt] = useState(() => Date.now())
  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) { setItems(map(await res.json())); setFetchedAt(Date.now()) }
    } catch {
    } finally { setBusy(false) }
  }, [url, map])
  return { items, busy, refresh, fetchedAt }
}

function logTime(ms: number): string {
  const d = new Date(ms), p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const mapQuotes = (j: unknown) => j as Quote[]

const MAX_MEMES = 1000

function MemeTile({ meme, root, onOpen, onGone }: { meme: Meme; root: React.RefObject<HTMLDivElement | null>; onOpen(): void; onGone(): void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [near, setNear] = useState(false)
  const [ar, setAr] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root: root.current, rootMargin: '1200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [root])
  return (
    <button ref={ref} className="meme" title={meme.title} onClick={onOpen} style={{ '--ar': ar } as React.CSSProperties}>
      {near && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meme.thumb}
          alt={meme.title}
          decoding="async"
          onError={onGone}
          onLoad={e => {
            const i = e.currentTarget
            if (i.naturalWidth === 130 && i.naturalHeight === 60) onGone()
            else setAr(Math.min(2.5, Math.max(0.4, i.naturalWidth / i.naturalHeight)))
          }}
        />
      )}
    </button>
  )
}

function MemeDialog({ memes, index, setIndex }: { memes: Meme[]; index: number | null; setIndex(i: number | null): void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const meme = index === null ? null : memes[index]
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (meme && !d.open) d.showModal()
    if (!meme && d.open) d.close()
  }, [meme])
  const step = (delta: number) => { if (index !== null) setIndex(Math.min(memes.length - 1, Math.max(0, index + delta))) }
  return (
    <dialog
      ref={ref}
      className="meme-dialog"
      onClose={() => setIndex(null)}
      onClick={e => { if (e.target === e.currentTarget) setIndex(null) }}
      onKeyDown={e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1) }}
    >
      {meme && (
        <>
          <div className="meme-dialog-header">
            <span className="meme-dialog-title" title={meme.title}>{meme.title || basenameOf(meme.url)}</span>
            <button className="action-label" title="Previous (Left Arrow)" disabled={index === 0} onClick={() => step(-1)}><Codicon name="arrow-left" /></button>
            <button className="action-label" title="Next (Right Arrow)" disabled={index === memes.length - 1} onClick={() => step(1)}><Codicon name="arrow-right" /></button>
            <a className="action-label" title="Open on Reddit" href={meme.postLink} target="_blank" rel="noopener noreferrer"><Codicon name="link-external" /></a>
            <button className="action-label" title="Close (Escape)" onClick={() => setIndex(null)}><Codicon name="close" /></button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="meme-dialog-image" src={meme.url} alt={meme.title} />
          <div className="meme-dialog-footer">
            <span>r/{meme.subreddit}</span><span>u/{meme.author}</span><span><Codicon name="arrow-up" /> {meme.ups.toLocaleString()}</span>
            <span className="meme-dialog-count">{index! + 1} / {memes.length}</span>
          </div>
        </>
      )}
    </dialog>
  )
}

const basenameOf = (url: string) => url.split('/').pop() ?? url

export function MemesEditor() {
  const { data } = useWorkbench()
  const [items, setItems] = useState(data.memes)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const loading = useRef(false)
  const misses = useRef(0)
  const batch = useRef(0)
  const seen = useRef(new Set(data.memes.map(m => m.url)))
  const body = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  const load = useCallback(async (reset: boolean) => {
    if (loading.current) return
    loading.current = true
    setBusy(true)
    try {
      if (reset) batch.current = 0
      const sub = MEME_SUBREDDITS[batch.current++ % MEME_SUBREDDITS.length]
      const res = await fetch(`/api/feeds/memes?sub=${sub}`, { cache: 'no-store' })
      const next: Meme[] = res.ok ? await res.json() : []
      if (reset) seen.current.clear()
      const fresh = next.filter(m => !seen.current.has(m.url))
      fresh.forEach(m => seen.current.add(m.url))
      misses.current = fresh.length ? 0 : misses.current + 1
      setItems(prev => (reset ? fresh : [...prev, ...fresh]).slice(0, MAX_MEMES))
    } catch {
      misses.current++
    } finally {
      loading.current = false
      setBusy(false)
    }
  }, [])

  useEffect(() => { setDone(misses.current >= 2 * MEME_SUBREDDITS.length || items.length >= MAX_MEMES) }, [items])

  useEffect(() => {
    const el = sentinel.current
    if (!el || done || busy) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) load(false) }, { root: body.current, rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [load, done, busy, items.length])

  const reload = () => {
    body.current?.scrollTo({ top: 0 })
    misses.current = 0
    setOpen(null)
    load(true)
  }
  const drop = (url: string) => setItems(prev => prev.filter(m => m.url !== url))

  return (
    <div className="feed-editor">
      <FeedToolbar title={`memes.feed — ${items.length} items`} busy={busy} onRefresh={reload} />
      <div className="feed-body scrollable" ref={body}>
        <div className="meme-feed">
          {items.map((m, i) => <MemeTile key={m.url} meme={m} root={body} onOpen={() => setOpen(i)} onGone={() => drop(m.url)} />)}
          <div ref={sentinel} className="meme-more">
            {done ? (items.length ? 'You reached the end of the feed.' : 'No memes could be loaded.') : <Codicon name="loading" className="codicon-modifier-spin" style={{ visibility: busy ? 'visible' : 'hidden' }} />}
          </div>
        </div>
      </div>
      <MemeDialog memes={items} index={open} setIndex={setOpen} />
    </div>
  )
}

export function QuotesEditor() {
  const { data } = useWorkbench()
  const { items, busy, refresh, fetchedAt } = useFeed(data.quotes, '/api/feeds/quotes', mapQuotes)
  useEffect(() => { if (!items.length) refresh() }, [items.length, refresh])
  return (
    <div className="feed-editor">
      <FeedToolbar title={`quotes.log — ${items.length} random quotes`} busy={busy} onRefresh={refresh} />
      <div className="feed-body scrollable log">
        {items.map((q, i) => (
          <div key={i} className="log-line">
            <span className="log-time">{logTime(fetchedAt - i * 61_000)}</span>
            <span className="log-level">[info]</span>
            <span className="log-msg">
              &ldquo;{q.content}&rdquo; <span className="log-author">— {q.author}</span>
              {q.tags.map(t => <span key={t} className="log-tag">#{t.replace(/\s+/g, '')}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ContributionDay { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }

export function ContributionsEditor() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [days, setDays] = useState<ContributionDay[] | null>(null)
  const [busy, setBusy] = useState(false)

  const latest = useRef(0)
  const load = useCallback(async (y: number) => {
    const req = ++latest.current
    setBusy(true)
    let days: ContributionDay[] = []
    try {
      const res = await fetch(`/api/contributions/${y}`)
      const json = res.ok ? await res.json() : null
      days = json?.contributions ?? []
    } catch {}
    if (req !== latest.current) return
    setDays(days)
    setBusy(false)
  }, [])
  useEffect(() => { load(year) }, [year, load])

  const total = days?.reduce((n, d) => n + d.count, 0) ?? 0
  const offset = days?.length ? new Date(days[0].date).getUTCDay() : 0
  const cells: (ContributionDay | null)[] = [...Array(offset).fill(null), ...(days ?? [])]
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7))

  return (
    <div className="feed-editor">
      <FeedToolbar title="contributions.graph" busy={busy} onRefresh={() => load(year)}>
        <select className="setting-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {Array.from({ length: thisYear - 2019 }, (_, i) => thisYear - i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </FeedToolbar>
      <div className="feed-body scrollable">
        <div className="contrib" style={{ '--weeks': weeks.length } as React.CSSProperties}>
          <div className="contrib-total">{days ? `${total} contributions in ${year}` : 'Loading…'}</div>
          <div className="contrib-months" aria-hidden="true">
            {weeks.map((w, i) => {
              const first = w.find(d => d?.date.endsWith('-01'))
              return <span key={i}>{first ? MONTHS[Number(first.date.slice(5, 7)) - 1] : ''}</span>
            })}
          </div>
          <div className="contrib-grid">
            <div className="contrib-days" aria-hidden="true">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            {weeks.map((w, i) => (
              <div key={i} className="contrib-week">
                {w.map((d, j) => d
                  ? <span key={j} className={`contrib-cell l${d.level}`} title={`${d.count} contributions on ${d.date}`} />
                  : <span key={j} className="contrib-cell empty" />)}
              </div>
            ))}
          </div>
          <div className="contrib-legend">
            Less {[0, 1, 2, 3, 4].map(l => <span key={l} className={`contrib-cell l${l}`} />)} More
          </div>
        </div>
      </div>
    </div>
  )
}
