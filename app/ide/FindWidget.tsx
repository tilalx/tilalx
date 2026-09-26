'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export interface FindMatch { line: number; index: number }

export interface FindWidgetProps {
  query:           string
  setQuery:        (v: string) => void
  replace:         string
  setReplace:      (v: string) => void
  replaceShown:    boolean
  onToggleReplace: () => void
  caseSensitive:   boolean
  onToggleCase:    () => void
  wholeWord:       boolean
  onToggleWord:    () => void
  useRegex:        boolean
  onToggleRegex:   () => void
  invalid:         boolean
  matches:         FindMatch[]
  index:           number
  onStep:          (dir: number) => void
  onReplaceAll?:   () => number
  onClose:         () => void
}

export default function FindWidget({
  query, setQuery, replace, setReplace,
  replaceShown, onToggleReplace,
  caseSensitive, onToggleCase,
  wholeWord, onToggleWord,
  useRegex, onToggleRegex,
  invalid, matches, index, onStep, onReplaceAll, onClose,
}: FindWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(0)
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape')      { e.preventDefault(); onClose() }
    else if (e.key === 'Enter')  { e.preventDefault(); onStep(e.shiftKey ? -1 : 1) }
  }

  const doReplaceAll = () => {
    const n = onReplaceAll?.() || 0
    if (n) { setCopied(n); setTimeout(() => setCopied(0), 1600) }
  }

  const count = matches.length
  const countText = invalid ? 'Bad regex' : (count ? `${index + 1} of ${count}` : (query ? 'No results' : ''))

  return (
    <div className="ide-find-widget" onMouseDown={e => e.stopPropagation()}>
      <button
        className="ide-find-expand"
        title={replaceShown ? 'Toggle Replace (collapse)' : 'Toggle Replace'}
        aria-label="Toggle Replace"
        onClick={onToggleReplace}
      >{replaceShown ? '⌄' : '›'}</button>

      <div className="ide-find-rows">
        <div className="ide-find-row">
          <input
            ref={inputRef}
            className={`ide-find-input${invalid ? ' invalid' : ''}`}
            placeholder="Find"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
          <div className="ide-find-toggles">
            <button className={`ide-find-toggle${caseSensitive ? ' on' : ''}`} title="Match Case (Alt+C)" onClick={onToggleCase}>Aa</button>
            <button className={`ide-find-toggle${wholeWord ? ' on' : ''}`} title="Match Whole Word (Alt+W)" onClick={onToggleWord}>ab</button>
            <button className={`ide-find-toggle${useRegex ? ' on' : ''}`} title="Use Regular Expression (Alt+R)" onClick={onToggleRegex}>.*</button>
          </div>
          <span className="ide-find-count">{countText}</span>
          <button className="ide-find-btn" title="Previous match (Shift+Enter)" disabled={!count} onClick={() => onStep(-1)}>↑</button>
          <button className="ide-find-btn" title="Next match (Enter)" disabled={!count} onClick={() => onStep(1)}>↓</button>
          <button className="ide-find-btn" title="Close (Esc)" onClick={onClose}>×</button>
        </div>

        {replaceShown && (
          <div className="ide-find-row">
            <input
              className="ide-find-input"
              placeholder="Replace"
              value={replace}
              onChange={e => setReplace(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}
              spellCheck={false}
            />
            <button
              className="ide-find-btn wide"
              title="Replace All — copies the result to your clipboard (read-only viewer)"
              disabled={!count}
              onClick={doReplaceAll}
            >{copied ? `Copied ${copied}` : 'Replace All'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
