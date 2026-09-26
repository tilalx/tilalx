'use client'

import { useMemo } from 'react'
import { computeProblems } from './utils'
import type { Repo } from './types'

export interface ProblemsPanelProps { repos: Repo[] | null | undefined }

export function ProblemsPanel({ repos }: ProblemsPanelProps) {
  const problems = useMemo(() => computeProblems(repos), [repos])
  return (
    <div className="ide-panel-content">
      <div style={{
        padding: '6px 12px 4px', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.08em', color: 'var(--ide-fg)',
        fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
        borderBottom: '1px solid var(--ide-border)',
      }}>
        {problems.length} {problems.length === 1 ? 'Problem' : 'Problems'}
      </div>
      {problems.length === 0 ? (
        <div style={{ padding: 12, color: 'var(--ide-green)', fontSize: 11, fontFamily: 'monospace' }}>✓ No problems detected</div>
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
