'use client'

import { useEffect, useRef, useMemo } from 'react'
import { computeProblems } from './utils'

export function ProblemsPanel({ repos }) {
  const problems = useMemo(() => computeProblems(repos), [repos])
  return (
    <div className="ide-panel-content">
      <div style={{
        padding: '6px 12px 4px', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', color: '#cdd6f4',
        fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
        borderBottom: '1px solid #313244',
      }}>
        {problems.length} {problems.length === 1 ? 'Problem' : 'Problems'}
      </div>
      {problems.length === 0 ? (
        <div style={{ padding: 12, color: '#a6e3a1', fontSize: 11, fontFamily: 'monospace' }}>✓ No problems detected</div>
      ) : problems.map((p, i) => (
        <div key={i} className={`ide-problem-item ${p.severity}`}>
          <span className="ide-problem-icon">{p.severity === 'warning' ? '⚠' : 'ℹ'}</span>
          <div className="ide-problem-body">
            <span className="ide-problem-msg">{p.msg}</span>
            <span className="ide-problem-file">{p.file}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TerminalPanel({ history, input, onInput, onSubmit, inputRef }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  return (
    <div className="ide-terminal-panel" onClick={() => inputRef.current?.focus()}>
      {history.map((line, i) => (
        <div key={i} className={`ide-term-line ${line.type}`}>
          {line.type === 'prompt' && <span className="ide-term-prompt">tilalx@dev:~$ </span>}
          <span className="ide-term-text">{line.text}</span>
        </div>
      ))}
      <div className="ide-term-input-row">
        <span className="ide-term-prompt">tilalx@dev:~$ </span>
        <input
          ref={inputRef}
          className="ide-term-input"
          value={input}
          onChange={e => onInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
          autoComplete="off" autoCorrect="off" spellCheck={false}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
