'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { CONTRIB_COLORS, CONTRIB_MONTHS } from './constants'

function contribColor(count) {
  if (count === 0) return CONTRIB_COLORS[0]
  if (count < 4)  return CONTRIB_COLORS[1]
  if (count < 8)  return CONTRIB_COLORS[2]
  if (count < 12) return CONTRIB_COLORS[3]
  return CONTRIB_COLORS[4]
}

const DAY_LABEL_W = 32
const GAP = 3

export default function ContributionGraph({ username, initialData }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear]         = useState(currentYear)
  const [data, setData]         = useState(initialData || null)
  const [loading, setLoading]   = useState(!initialData)
  const [cellSize, setCellSize] = useState(12)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (year === currentYear && initialData) {
      setData(initialData)
      setLoading(false)
      return
    }
    setLoading(true)
    setData(null)
    fetch(`/api/contributions/${year}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [username, year])

  const { weeks, monthLabels, total } = useMemo(() => {
    if (!data?.contributions) return { weeks: [], monthLabels: [], total: 0 }
    const today = new Date(); today.setHours(23, 59, 59, 999)
    const days  = data.contributions.filter(d => new Date(d.date) <= today)
    if (!days.length) return { weeks: [], monthLabels: [], total: 0 }
    const total    = days.reduce((s, d) => s + d.count, 0)
    const firstDow = new Date(days[0].date).getDay()
    const padded   = [...Array(firstDow).fill(null), ...days]
    const weeks    = []
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))
    const monthLabels = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const first = week.find(Boolean)
      if (!first) return
      const m = new Date(first.date).getMonth()
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
          {loading ? '…' : `${total.toLocaleString()} contributions in ${year}`}
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
          {/* Month labels */}
          <div style={{ position: 'relative', height: 18, marginLeft: DAY_LABEL_W, marginBottom: 6 }}>
            {monthLabels.map(({ wi, label }) => (
              <span key={wi} style={{ position: 'absolute', left: wi * pitch, fontSize: 11, color: 'var(--ide-muted)', userSelect: 'none' }}>
                {label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
            {/* Day labels */}
            <div style={{ width: DAY_LABEL_W, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 0 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} style={{ height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6, fontSize: 10, color: 'var(--ide-muted)', userSelect: 'none' }}>
                  {i === 1 ? 'Mon' : i === 3 ? 'Wed' : i === 5 ? 'Fri' : ''}
                </div>
              ))}
            </div>

            {/* Weeks */}
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

          {/* Legend */}
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
