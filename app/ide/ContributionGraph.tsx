'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { CONTRIB_COLORS, CONTRIB_MONTHS } from './constants'

export interface ContributionDay { date: string; count: number; level?: number }
export interface ContributionData { contributions: ContributionDay[]; total?: Record<string, number> }

export interface ContributionGraphProps {
  username:    string
  initialData: ContributionData | null
}

function contribColor(count: number): string {
  if (count === 0) return CONTRIB_COLORS[0]
  if (count < 4)  return CONTRIB_COLORS[1]
  if (count < 8)  return CONTRIB_COLORS[2]
  if (count < 12) return CONTRIB_COLORS[3]
  return CONTRIB_COLORS[4]
}

// 'YYYY-MM-DD' alone parses as UTC midnight, which shifts the weekday west of UTC.
const localDate = (s: string) => new Date(`${s}T00:00:00`)

const DAY_LABEL_W = 32
const GAP = 3

export default function ContributionGraph({ username, initialData }: ContributionGraphProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear]         = useState(currentYear)
  const [data, setData]         = useState<ContributionData | null>(initialData || null)
  const [loading, setLoading]   = useState(!initialData)
  const [cellSize, setCellSize] = useState(12)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (year === currentYear && initialData) {
      setData(initialData)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setData(null)
    fetch(`/api/contributions/${year}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [username, year])

  const { weeks, monthLabels, total } = useMemo(() => {
    if (!data?.contributions) return { weeks: [], monthLabels: [], total: 0 }
    const today = new Date(); today.setHours(23, 59, 59, 999)
    const days  = data.contributions.filter(d => localDate(d.date) <= today)
    if (!days.length) return { weeks: [], monthLabels: [], total: 0 }
    const total    = days.reduce((s, d) => s + d.count, 0)
    const firstDow = localDate(days[0].date).getDay()
    const padded: (ContributionDay | null)[] = [...Array(firstDow).fill(null), ...days]
    const weeks: (ContributionDay | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
    const monthLabels: { wi: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const first = week.find(Boolean)
      if (!first) return
      const m = localDate(first.date).getMonth()
      if (m !== lastMonth) { monthLabels.push({ wi, label: CONTRIB_MONTHS[m] }); lastMonth = m }
    })
    return { weeks, monthLabels, total }
  }, [data])

  useEffect(() => {
    const el = wrapRef.current
    if (!el || !weeks.length) return
    const update = () => {
      const avail = el.clientWidth - DAY_LABEL_W - (weeks.length - 1) * GAP
      setCellSize(Math.max(9, Math.min(16, Math.floor(avail / weeks.length))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [weeks.length])

  const pitch = cellSize + GAP

  return (
    <div className="ide-contrib-wrap" ref={wrapRef}>
      <div className="ide-contrib-header">
        <span className="ide-contrib-count">
          {loading ? '…' : data ? `${total.toLocaleString()} contributions in ${year}` : `Couldn't load contributions for ${year}`}
        </span>
        <div className="ide-contrib-years">
          {[currentYear, currentYear-1, currentYear-2, currentYear-3].map(y => (
            <button key={y} className={`ide-contrib-year-btn${y === year ? ' active' : ''}`} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ide-contrib-loading">Loading contributions…</div>
      ) : (
        <>
          <div style={{ position: 'relative', height: 18, marginLeft: DAY_LABEL_W, marginBottom: 6 }}>
            {monthLabels.map(({ wi, label }) => (
              <span key={wi} style={{ position: 'absolute', left: wi * pitch, fontSize: 11, color: 'var(--ide-muted)', userSelect: 'none' }}>
                {label}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
            <div style={{ width: DAY_LABEL_W, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: GAP }}>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} style={{ height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 10, color: 'var(--ide-muted)', userSelect: 'none' }}>
                  {i === 1 ? 'Mon' : i === 3 ? 'Wed' : i === 5 ? 'Fri' : ''}
                </div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: cellSize, flexShrink: 0 }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const day = week[di]
                  return (
                    <div
                      key={di}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: Math.max(2, cellSize * 0.18),
                        background: day ? contribColor(day.count) : 'transparent',
                        flexShrink: 0,
                      }}
                      title={day ? `${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}` : ''}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end', fontSize: 11, color: 'var(--ide-muted)' }}>
            <span>Less</span>
            {CONTRIB_COLORS.map((c, i) => (
              <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: Math.max(2, cellSize * 0.18), background: c, flexShrink: 0 }} />
            ))}
            <span>More</span>
          </div>
        </>
      )}
    </div>
  )
}
