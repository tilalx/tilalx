'use client'

import { useEffect, useRef, useState } from 'react'

// VS Code-style find box (Ctrl+F) for the code viewer. It doesn't mutate the DOM
// highlight directly — instead it reports the active match's line up so CodeViewer
// can scroll/emphasize it. `matches` is an array of { line, col } precomputed by
// the parent for the current query.
export default function FindWidget({ query, setQuery, matches, index, onStep, onClose }) {
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Escape')      { e.preventDefault(); onClose() }
    else if (e.key === 'Enter')  { e.preventDefault(); onStep(e.shiftKey ? -1 : 1) }
  }

  const count = matches.length
  return (
    <div className="ide-find-widget" onMouseDown={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        className="ide-find-input"
        placeholder="Find"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
      />
      <span className="ide-find-count">{count ? `${index + 1} of ${count}` : (query ? 'No results' : '')}</span>
      <button className="ide-find-btn" title="Previous match (Shift+Enter)" disabled={!count} onClick={() => onStep(-1)}>↑</button>
      <button className="ide-find-btn" title="Next match (Enter)"           disabled={!count} onClick={() => onStep(1)}>↓</button>
      <button className="ide-find-btn" title="Close (Esc)" onClick={onClose}>×</button>
    </div>
  )
}
