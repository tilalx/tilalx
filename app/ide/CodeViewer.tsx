'use client'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { syntaxHighlight } from './syntax'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import FindWidget, { type FindMatch } from './FindWidget'

export interface CodeViewerProps {
  filename?:     string
  content:       string
  scrollToLine?: number
  minimap:       boolean
  stickyScroll:  boolean
  indentGuides:  boolean
  wordWrap:      boolean
  active:        boolean
  onCursor?:     (line: number, col: number) => void
}

export function LineNumbers({ count }: { count: number }) {
  return (
    <div className="ide-line-numbers">
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  )
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'ico', 'gif'])

// Tabs count as two columns.
function indentOf(s: string): number {
  let n = 0
  for (const c of s) { if (c === ' ') n++; else if (c === '\t') n += 2; else break }
  return n
}

const unescapeHtml = (s: string) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&')
const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Marks matches in the text between tags of an already highlighted line.
function markLine(html: string, re: RegExp, curIndex: number): string {
  const parts = html.split(/(<[^>]*>)/)
  let pos = 0, out = ''
  for (const p of parts) {
    if (!p) continue
    if (p[0] === '<') { out += p; continue }
    const text = unescapeHtml(p)
    let last = 0
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      out += escapeHtml(text.slice(last, m.index))
      const cls = pos + m.index === curIndex ? 'ide-find-mark current' : 'ide-find-mark'
      out += `<mark class="${cls}">${escapeHtml(m[0])}</mark>`
      last = m.index + m[0].length
      if (!m[0].length) re.lastIndex++
    }
    out += escapeHtml(text.slice(last))
    pos += text.length
  }
  return out
}

export default function CodeViewer({ filename, content, scrollToLine, minimap, stickyScroll, indentGuides, wordWrap, active, onCursor }: CodeViewerProps) {
  const scrollRef    = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState(0)
  const [scrollH,   setScrollH]   = useState(0)
  const [firstLine, setFirstLine] = useState(0)
  const [viewH,     setViewH]     = useState(0)
  const [findOpen,  setFindOpen]  = useState(false)
  const [replaceShown, setReplaceShown] = useState(false)
  const [query,     setQuery]     = useState('')
  const [replace,   setReplace]   = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord,     setWholeWord]     = useState(false)
  const [useRegex,      setUseRegex]      = useState(false)
  const [matchIdx,  setMatchIdx]  = useState(0)
  const [cursor,    setCursor]    = useState({ line: 1, col: 1 })

  const ext = useMemo(() => {
    const name = (filename || '').split('/').pop()!
    if (name === 'Dockerfile') return 'dock'
    if (name === '.gitignore') return 'git'
    return name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
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

  const find = useMemo(() => {
    if (!query) return { matches: [], invalid: false, source: '', flags: '' }
    let source = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (wholeWord) source = `\\b(?:${source})\\b`
    const flags = 'g' + (caseSensitive ? '' : 'i')
    let re: RegExp
    try { re = new RegExp(source, flags) } catch { return { matches: [], invalid: true, source: '', flags: '' } }
    const out: FindMatch[] = []
    rawLines.forEach((l, i) => {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(l)) !== null) {
        out.push({ line: i + 1, index: m.index })
        if (!m[0].length) re.lastIndex++
      }
    })
    return { matches: out, invalid: false, source, flags }
  }, [query, useRegex, wholeWord, caseSensitive, rawLines])

  const matches = find.matches
  useEffect(() => { setMatchIdx(0) }, [query, caseSensitive, wholeWord, useRegex])

  const stepMatch = useCallback((dir: number) => {
    if (!matches.length) return
    setMatchIdx(i => {
      const next = (i + dir + matches.length) % matches.length
      const ln = matches[next].line
      scrollRef.current?.querySelector(`[data-line="${ln}"]`)?.scrollIntoView({ block: 'center' })
      return next
    })
  }, [matches])

  // The viewer is read-only, so Replace All copies the result to the clipboard.
  const replaceAll = useCallback(() => {
    if (!find.source || !find.matches.length) return 0
    let out: string
    try { out = (content || '').replace(new RegExp(find.source, find.flags), replace) } catch { return 0 }
    try { navigator.clipboard?.writeText(out) } catch {}
    return find.matches.length
  }, [find, replace, content])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return // Ctrl+Shift+F is Find in Files
      const k = e.key.toLowerCase()
      if (k === 'f') { e.preventDefault(); e.stopPropagation(); setFindOpen(true); setReplaceShown(false) }
      else if (k === 'h') { e.preventDefault(); e.stopPropagation(); setFindOpen(true); setReplaceShown(true) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active])

  const matchLines = useMemo(() => new Set(matches.map(m => m.line)), [matches])
  const currentMatch = matches[matchIdx]
  const currentMatchLine = currentMatch?.line

  const reportCursor = useCallback((line: number, col: number) => { setCursor({ line, col }); onCursor?.(line, col) }, [onCursor])
  useEffect(() => { reportCursor(1, 1) }, [filename])
  useEffect(() => { if (scrollToLine) reportCursor(scrollToLine, 1) }, [scrollToLine])

  const onRowClick = useCallback((e: ReactMouseEvent<HTMLDivElement>, ln: number) => {
    const codeEl = e.currentTarget.querySelector('.ide-line-code')
    if (!codeEl) { reportCursor(ln, 1); return }
    const rect = codeEl.getBoundingClientRect()
    const fs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ide-font-size')) || 13
    const charW = fs * 0.6 // JetBrains Mono advance ≈ 0.6em
    const lineLen = (rawLines[ln - 1] || '').length
    const col = Math.min(lineLen + 1, Math.max(1, Math.round((e.clientX - rect.left) / charW) + 1))
    reportCursor(ln, col)
  }, [rawLines, reportCursor])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Rows vary in height with word wrap, so binary-search the DOM for the top one.
    const onScroll = () => {
      setScrollTop(el.scrollTop)
      setScrollH(el.scrollHeight)
      const rows = el.querySelector('.ide-code-body')?.children
      if (!rows?.length) return
      const top = el.getBoundingClientRect().top
      let lo = 0, hi = rows.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (rows[mid].getBoundingClientRect().top - top <= 0) lo = mid; else hi = mid - 1
      }
      setFirstLine(lo)
    }
    const ro = new ResizeObserver(() => { setViewH(el.clientHeight); onScroll() })
    el.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(el)
    setViewH(el.clientHeight)
    onScroll()
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect() }
  }, [isImage, content, wordWrap])

  useEffect(() => {
    if (scrollToLine && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollToLine, filename])

  const sticky = useMemo(() => {
    if (!stickyScroll || isImage) return []
    if (firstLine <= 0) return []
    if (isMd) {
      for (let i = firstLine - 1; i >= 0; i--) {
        if (/^#{1,6}\s/.test(rawLines[i])) return [{ text: rawLines[i], line: i + 1 }]
      }
      return []
    }
    const res: { text: string; line: number }[] = []
    let need = indentOf(rawLines[firstLine] ?? '')
    for (let i = firstLine - 1; i >= 0 && res.length < 3; i--) {
      const l = rawLines[i]
      if (!l.trim()) continue
      const ind = indentOf(l)
      if (ind < need) { res.unshift({ text: l, line: i + 1 }); need = ind; if (ind === 0) break }
    }
    return res
  }, [stickyScroll, isImage, isMd, firstLine, rawLines])

  const showMinimap = minimap && !isImage && rawLines.length > 1
  const miniLineH = showMinimap ? Math.min(3, viewH / Math.max(rawLines.length, 1)) : 3
  const sliderTop = scrollH > 0 ? (scrollTop / scrollH) * (rawLines.length * miniLineH) : 0
  const sliderH   = scrollH > 0 ? Math.max(20, (viewH / scrollH) * (rawLines.length * miniLineH)) : 0

  const jumpFromMinimap = (clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const sc = scrollRef.current
    if (sc) sc.scrollTop = ratio * (scrollH - viewH)
  }
  const onMiniDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget // React nulls currentTarget once the handler returns
    jumpFromMinimap(e.clientY, el)
    const move = (ev: PointerEvent) => jumpFromMinimap(ev.clientY, el)
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
          replace={replace} setReplace={setReplace}
          replaceShown={replaceShown} onToggleReplace={() => setReplaceShown(s => !s)}
          caseSensitive={caseSensitive} onToggleCase={() => setCaseSensitive(v => !v)}
          wholeWord={wholeWord} onToggleWord={() => setWholeWord(v => !v)}
          useRegex={useRegex} onToggleRegex={() => setUseRegex(v => !v)}
          invalid={find.invalid}
          matches={matches} index={matchIdx}
          onStep={stepMatch}
          onReplaceAll={replaceAll}
          onClose={() => { setFindOpen(false); setQuery(''); setReplace('') }}
        />
      )}

      <div className="ide-code-scroll" ref={scrollRef}>
        {imgSrc && (
          <div className="ide-image-preview">
            <img src={imgSrc} alt={filename} className="ide-preview-img" />
          </div>
        )}
        {!isImage && (
          <pre className={`ide-code-body${indentGuides ? ' with-guides' : ''}${wordWrap ? ' wrap' : ''}`}>
            {highlightedLines.map((hlLine, i) => {
              const ln = i + 1
              const isHighlight = scrollToLine === ln
              const isMatch = matchLines.has(ln)
              const isCursor = cursor.line === ln
              const html = isMatch && find.source
                ? markLine(hlLine, new RegExp(find.source, find.flags), currentMatchLine === ln ? currentMatch.index : -1)
                : (hlLine || ' ')
              return (
                <div
                  key={i}
                  data-line={ln}
                  ref={isHighlight ? highlightRef : null}
                  className={`ide-code-row${isHighlight ? ' highlight' : ''}${isMatch ? ' match' : ''}${isCursor ? ' cursor-line' : ''}`}
                  onMouseDown={e => onRowClick(e, ln)}
                >
                  <span className="ide-line-num">{ln}</span>
                  <span className="ide-line-code" dangerouslySetInnerHTML={{ __html: html }} />
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
              style={{ paddingLeft: 52 }}
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
