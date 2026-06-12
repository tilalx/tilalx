'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

// Subsequence fuzzy match: every char of `q` appears in `text` in order.
// Returns a score (lower = better: earlier + tighter match) or -1 for no match.
function fuzzyScore(text, q) {
  if (!q) return 0
  const t = text.toLowerCase()
  let ti = 0, first = -1, last = -1
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    const found = t.indexOf(c, ti)
    if (found === -1) return -1
    if (first === -1) first = found
    last = found
    ti = found + 1
  }
  return first + (last - first) * 0.5 // bias toward early, contiguous matches
}

export default function CommandPalette({ open, initialMode, files, commands, onOpenFile, onClose }) {
  const [query, setQuery] = useState('')
  const [sel, setSel]     = useState(0)
  const inputRef = useRef(null)
  const listRef  = useRef(null)

  // `>` prefix forces command mode (VS Code convention); otherwise use the
  // mode the palette was opened in.
  const commandMode = initialMode === 'commands' || query.startsWith('>')
  const cleanQuery  = (query.startsWith('>') ? query.slice(1) : query).trim()

  useEffect(() => {
    if (open) {
      setQuery(initialMode === 'commands' ? '>' : '')
      setSel(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, initialMode])

  const results = useMemo(() => {
    if (!open) return []
    const source = commandMode
      ? commands.map(c => ({ kind: 'command', label: c.label, hint: c.hint, run: c.run, key: c.id }))
      : files.map(f => ({ kind: 'file', label: f.split('/').pop(), hint: f, path: f, key: f }))
    const scored = source
      .map(item => ({ item, score: fuzzyScore(item.label + ' ' + (item.hint || ''), cleanQuery.toLowerCase()) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 50)
      .map(x => x.item)
    return scored
  }, [open, commandMode, cleanQuery, files, commands])

  useEffect(() => { setSel(0) }, [query])

  useEffect(() => {
    listRef.current?.querySelector('.ide-palette-item.active')
      ?.scrollIntoView({ block: 'nearest' })
  }, [sel, results])

  if (!open) return null

  const choose = (item) => {
    if (!item) return
    if (item.kind === 'file') onOpenFile(item.path)
    else item.run()
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape')            { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown')    { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')      { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter')        { e.preventDefault(); choose(results[sel]) }
  }

  return (
    <div className="ide-palette-overlay" onMouseDown={onClose}>
      <div className="ide-palette" onMouseDown={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="ide-palette-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={commandMode ? 'Type a command…' : 'Search files by name (prefix with > for commands)'}
          spellCheck={false}
          autoComplete="off"
        />
        <div className="ide-palette-list" ref={listRef}>
          {results.length === 0 && (
            <div className="ide-palette-empty">No matching {commandMode ? 'commands' : 'files'}</div>
          )}
          {results.map((item, i) => (
            <div
              key={item.key}
              className={`ide-palette-item${i === sel ? ' active' : ''}`}
              onMouseEnter={() => setSel(i)}
              onMouseDown={e => { e.preventDefault(); choose(item) }}
            >
              <span className="ide-palette-label">{item.label}</span>
              {item.hint && item.hint !== item.label && (
                <span className="ide-palette-hint">{item.hint}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
