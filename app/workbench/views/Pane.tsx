'use client'

import type { ReactNode } from 'react'
import { Codicon } from '../icons'

export interface PaneAction { icon: string; title: string; run(): void }

export function Pane({ title, expanded, onToggle, actions = [], children, grow = true }: {
  title: string
  expanded: boolean
  onToggle(): void
  actions?: PaneAction[]
  children?: ReactNode
  /** Expanded panes share the remaining height; non-growing ones size to content. */
  grow?: boolean
}) {
  return (
    <div className={`pane${expanded && grow ? ' expanded' : ''}`} style={expanded && !grow ? { flex: 'none' } : undefined}>
      <div
        className="pane-header"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        // Keys on the action buttons bubble up here; let those buttons handle their own Enter/Space.
        onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle() } }}
      >
        <Codicon name={expanded ? 'chevron-down' : 'chevron-right'} />
        <span className="title">{title}</span>
        <div className="actions" onClick={e => e.stopPropagation()}>
          {actions.map(a => (
            <button key={a.title} className="action-label" title={a.title} onClick={a.run}><Codicon name={a.icon} /></button>
          ))}
        </div>
      </div>
      {expanded && <div className="pane-body scrollable">{children}</div>}
    </div>
  )
}

export function ViewTitle({ title, actions = [] }: { title: string; actions?: PaneAction[] }) {
  return (
    <div className="composite-title">
      <h2>{title}</h2>
      <div className="actions">
        {actions.map(a => (
          <button key={a.title} className="action-label" title={a.title} onClick={a.run}><Codicon name={a.icon} /></button>
        ))}
      </div>
    </div>
  )
}
