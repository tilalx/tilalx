'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkbench } from '../context'
import { Codicon } from '../icons'
import type { Meme, Quote } from '../types'

/** Custom editors for the live feeds. They render like VS Code's custom editor webviews: own toolbar, own scroll. */

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
      // Keep showing the previous items; the refresh button stays available.
    } finally { setBusy(false) }
  }, [url, map])
  return { items, busy, refresh, fetchedAt }
}

const mapMemes  = (j: unknown) => j as Meme[]

/** `YYYY-MM-DD HH:MM:SS` in the visitor's time zone, like VS Code's output channels. */
function logTime(ms: number): string {
  const d = new Date(ms), p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const hideTile =(img: HTMLImageElement) => { (img.parentElement as HTMLElement).style.display = 'none' }
const mapQuotes = (j: unknown) => j as Quote[]

export function MemesEditor() {
  const { data } = useWorkbench()
  const { items, busy, refresh } = useFeed(data.memes, '/api/feeds/memes', mapMemes)
  useEffect(() => { if (!items.length) refresh() }, [items.length, refresh])
  return (
    <div className="feed-editor">
      <FeedToolbar title={`memes.feed — ${items.length} items`} busy={busy} onRefresh={refresh} />
      <div className="feed-body scrollable">
        <div className="meme-grid">
          {items.map(m => (
            <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="meme">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.thumb}
                alt=""
                loading="lazy"
                // Memes get deleted upstream; drop the tile instead of showing a broken image.
                onError={e => hideTile(e.currentTarget)}
                // A deleted i.redd.it image still decodes: Reddit serves a 130×60 "probably deleted" PNG with its 404.
                onLoad={e => { const i = e.currentTarget; if (i.naturalWidth === 130 && i.naturalHeight === 60) hideTile(i) }}
              />
            </a>
          ))}
        </div>
      </div>
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
            {/* Log-style timestamps, one per quote, counting back from when the batch was fetched. */}
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

  // Switching years quickly must not let an older, slower response overwrite the newer one.
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
        <div className="contrib">
          <div className="contrib-total">{days ? `${total} contributions in ${year}` : 'Loading…'}</div>
          <div className="contrib-months" aria-hidden="true">
            {weeks.map((w, i) => {
              // Like GitHub: a month's label sits on the week that contains its 1st.
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
