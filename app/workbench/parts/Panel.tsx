'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import type { PanelId } from '../context'

const Terminal = dynamic(() => import('../terminal/Terminal'), { ssr: false })

const TABS: { id: PanelId; label: string }[] = [
  { id: 'problems', label: 'Problems' },
  { id: 'output',   label: 'Output' },
  { id: 'debug',    label: 'Debug Console' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'ports',    label: 'Ports' },
]

const bootTime = new Date()
const ts = (offsetMs: number) => new Date(bootTime.getTime() + offsetMs).toISOString().replace('T', ' ').replace('Z', '')

export default function Panel() {
  const wb = useWorkbench()
  const [termOpened, setTermOpened] = useState(wb.panel.view === 'terminal')
  if (wb.panel.view === 'terminal' && !termOpened) setTermOpened(true)

  const output = [
    `${ts(0)} [info] Starting tilalx workbench`,
    `${ts(12)} [info] Loaded ${wb.data.tree.length} root entries from the workspace`,
    `${ts(31)} [info] GitHub: ${wb.data.repos.length} repositories, ${wb.data.commits.length} recent commits`,
    `${ts(47)} [info] Feeds: ${wb.data.memes.length} memes, ${wb.data.quotes.length} quotes`,
    `${ts(52)} [info] Color theme: ${wb.theme.label}`,
  ]

  return (
    <div className="panel" role="region" aria-label="Panel">
      <div className="panel-title">
        <div className="panel-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={wb.panel.view === t.id}
              className={`panel-tab${wb.panel.view === t.id ? ' checked' : ''}`}
              onClick={() => wb.showPanel(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="panel-actions">
          {wb.panel.view === 'terminal' && <>
            <span className="terminal-label"><Codicon name="terminal" /> bash</span>
            <button className="action-label" title="New Terminal" onClick={() => wb.notify('One terminal is plenty for a personal page.')}><Codicon name="add" /></button>
            <span className="panel-separator" />
          </>}
          <button className="action-label" title={wb.panel.maximized ? 'Restore Panel Size' : 'Maximize Panel Size'} onClick={wb.toggleMaximizedPanel}>
            <Codicon name={wb.panel.maximized ? 'chevron-down' : 'chevron-up'} />
          </button>
          <button className="action-label" title="Hide Panel" onClick={wb.togglePanel}><Codicon name="close" /></button>
        </div>
      </div>
      <div className="panel-body">
        {wb.panel.view === 'problems' && <div className="panel-message">No problems have been detected in the workspace.</div>}
        {wb.panel.view === 'output' && (
          <div className="output-view scrollable">
            {output.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
        {wb.panel.view === 'debug' && <div className="panel-message">Debug console is empty: nothing is broken right now.</div>}
        {wb.panel.view === 'ports' && (
          <div className="panel-message">
            No forwarded ports. The page itself is served on <a href="https://aelx.de" target="_blank" rel="noopener noreferrer">aelx.de</a>.
          </div>
        )}
        {termOpened && (
          <div className="terminal-wrapper" style={{ display: wb.panel.view === 'terminal' ? 'block' : 'none' }}>
            <Terminal visible={wb.panel.visible && wb.panel.view === 'terminal'} />
          </div>
        )}
      </div>
    </div>
  )
}
