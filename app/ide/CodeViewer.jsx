'use client'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { syntaxHighlight } from './syntax'
import FindWidget from './FindWidget'

function LineNumbers({ count }) {
  return (
    <div className="ide-line-numbers">
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  )
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'ico', 'gif'])
const LINE_H = 22

// Leading-indent width (tabs count as 2 columns) — used for sticky scroll.
function indentOf(s) {
  let n = 0
  for (const c of s) { if (c === ' ') n++; else if (c === '\t') n += 2; else break }
  return n
}

export default function CodeViewer({ filename, content, scrollToLine, minimap, stickyScroll, indentGuides, active }) {
  const scrollRef    = useRef(null)
  const highlightRef = useRef(null)

  const [scrollTop, setScrollTop] = useState(0)
  const [viewH,     setViewH]     = useState(0)
  const [findOpen,  setFindOpen]  = useState(false)
  const [query,     setQuery]     = useState('')
  const [matchIdx,  setMatchIdx]  = useState(0)

  const ext = useMemo(() => {
    const name = (filename || '').split('/').pop()
    if (name === 'Dockerfile') return 'dock'
    if (name === '.gitignore') return 'git'
    return name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  }, [filename])

  const isSvg     = ext === 'svg'
  const isImage   = IMAGE_EXTS.has(ext)
  const isMd      = ext === 'md' || ext === 'markdown'
  const publicUrl = filename?.startsWith('public/') ? `/${filename.slice(7)}` : null

  const svgDataUrl = useMemo(() => {
    if (!isSvg || !content) return null
    try { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}` } catch { return null }
  }, [isSvg, content])

  const rawLines = useMemo(() => (content || '').split('\n'), [content])
  const highlightedLines = useMemo(() => {
    if (isImage) return []
    return syntaxHighlight(content || '', ext).split('\n')
  }, [content, ext, isImage])

  // ── Find (Ctrl+F) ──────────────────────────────────────────────────────────
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []
    rawLines.forEach((l, i) => { if (l.toLowerCase().includes(q)) out.push({ line: i + 1 }) })
    return out
  }, [query, rawLines])

  useEffect(() => { setMatchIdx(0) }, [query])

  const stepMatch = useCallback((dir) => {
    if (!matches.length) return
    setMatchIdx(i => {
      const next = (i + dir + matches.length) % matches.length
      const ln = matches[next].line
      scrollRef.current?.querySelector(`[data-line="${ln}"]`)?.scrollIntoView({ block: 'center' })
      return next
    })
  }, [matches])

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault(); e.stopPropagation()
        setFindOpen(true)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active])

  const matchLines = useMemo(() => new Set(matches.map(m => m.line)), [matches])
  const currentMatchLine = matches[matchIdx]?.line

  // ── Scroll tracking (for sticky + minimap) ──────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(el)
    setViewH(el.clientHeight)
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect() }
  }, [isImage])

  useEffect(() => {
    if (scrollToLine && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollToLine, filename])

  // ── Sticky scroll: enclosing scope lines pinned at the top ───────────────────
  const sticky = useMemo(() => {
    if (!stickyScroll || isImage) return []
    const first = Math.floor(scrollTop / LINE_H)
    if (first <= 0) return []
    if (isMd) {
      for (let i = first - 1; i >= 0; i--) {
        if (/^#{1,6}\s/.test(rawLines[i])) return [{ text: rawLines[i], line: i + 1 }]
      }
      return []
    }
    const res = []
    let need = indentOf(rawLines[first] ?? '')
    for (let i = first - 1; i >= 0 && res.length < 3; i--) {
      const l = rawLines[i]
      if (!l.trim()) continue
      const ind = indentOf(l)
      if (ind < need) { res.unshift({ text: l, line: i + 1 }); need = ind; if (ind === 0) break }
    }
    return res
  }, [stickyScroll, isImage, isMd, scrollTop, rawLines])

  // ── Minimap geometry ─────────────────────────────────────────────────────────
  const showMinimap = minimap && !isImage && rawLines.length > 1
  const miniLineH = showMinimap ? Math.min(3, viewH / Math.max(rawLines.length, 1)) : 3
  const contentH  = rawLines.length * LINE_H
  const sliderTop = contentH > 0 ? (scrollTop / contentH) * (rawLines.length * miniLineH) : 0
  const sliderH   = contentH > 0 ? Math.max(20, (viewH / contentH) * (rawLines.length * miniLineH)) : 0

  const jumpFromMinimap = (clientY, el) => {
    const rect = el.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const sc = scrollRef.current
    if (sc) sc.scrollTop = ratio * (contentH - viewH)
  }
  const onMiniDown = (e) => {
    jumpFromMinimap(e.clientY, e.currentTarget)
    const move = (ev) => jumpFromMinimap(ev.clientY, e.currentTarget)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const imgSrc = isImage ? publicUrl : (isSvg ? (publicUrl || svgDataUrl) : null)

  return (
    <div className="ide-code-viewer">
      {findOpen && (
        <FindWidget
          query={query} setQuery={setQuery}
          matches={matches} index={matchIdx}
          onStep={stepMatch}
          onClose={() => { setFindOpen(false); setQuery('') }}
        />
      )}

      <div className="ide-code-scroll" ref={scrollRef}>
        {imgSrc && (
          <div className="ide-image-preview">
            <img src={imgSrc} alt={filename} className="ide-preview-img" />
          </div>
        )}
        {!isImage && (
          <pre className={`ide-code-body${indentGuides ? ' with-guides' : ''}`}>
            {highlightedLines.map((hlLine, i) => {
              const ln = i + 1
              const isHighlight = scrollToLine === ln
              const isMatch = matchLines.has(ln)
              const isCurrent = currentMatchLine === ln
              return (
                <div
                  key={i}
                  data-line={ln}
                  ref={isHighlight ? highlightRef : null}
                  className={`ide-code-row${isHighlight ? ' highlight' : ''}${isMatch ? ' match' : ''}${isCurrent ? ' match-current' : ''}`}
                >
                  <span className="ide-line-num">{ln}</span>
                  <span className="ide-line-code" dangerouslySetInnerHTML={{ __html: hlLine || ' ' }} />
                </div>
              )
            })}
          </pre>
        )}
      </div>

      {sticky.length > 0 && (
        <div className="ide-sticky-scroll" style={{ right: showMinimap ? 70 : 0 }}>
          {sticky.map((s, i) => (
            <div
              key={i}
              className="ide-sticky-line"
              style={{ paddingLeft: 52 + indentOf(s.text) * 0 }}
              onClick={() => scrollRef.current?.querySelector(`[data-line="${s.line}"]`)?.scrollIntoView({ block: 'start' })}
            >
              <span className="ide-sticky-num">{s.line}</span>
              <span className="ide-sticky-text">{s.text.trim()}</span>
            </div>
          ))}
        </div>
      )}

      {showMinimap && (
        <div className="ide-minimap" onPointerDown={onMiniDown}>
          <div className="ide-minimap-canvas">
            {rawLines.map((l, i) => {
              const len = Math.min(l.trimEnd().length, 80)
              const lead = indentOf(l)
              return (
                <div key={i} className="ide-minimap-row" style={{ height: miniLineH }}>
                  {len > 0 && (
                    <span className="ide-minimap-bar" style={{ marginLeft: `${Math.min(lead, 40)}%`, width: `${Math.max(2, (len / 80) * (100 - Math.min(lead, 40)))}%` }} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="ide-minimap-slider" style={{ top: sliderTop, height: sliderH }} />
        </div>
      )}
    </div>
  )
}

export { LineNumbers }
