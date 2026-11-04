'use client'

import { useState } from 'react'
import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { Pane, ViewTitle } from './Pane'

const VARIABLES: [string, string, string?][] = [
  ['name', '"Tilo Alexander"', 'string'],
  ['role', '"Systems & DevOps Engineer"', 'string'],
  ['location', '"Germany"', 'string'],
  ['handle', '"@tilalx"', 'string'],
  ['selfHostedServices', 'Infinity', 'number'],
  ['opinionsOnLogAggregation', '"strong"', 'string'],
  ['automatesAfterNRuns', '2', 'number'],
]

export default function RunAndDebug() {
  const wb = useWorkbench()
  const [panes, setPanes] = useState({ variables: true, watch: false, stack: false, breakpoints: false })
  const toggle = (k: keyof typeof panes) => () => setPanes(p => ({ ...p, [k]: !p[k] }))

  return (
    <>
      <ViewTitle title="Run and Debug" actions={[{ icon: 'ellipsis', title: 'Views and More Actions...', run: () => wb.quickInput('commands') }]} />
      <div className="sidebar-content">
        <div className="welcome-view">
          <button className="monaco-button" onClick={() => wb.showPanel('terminal')}>Run and Debug</button>
          <p>Opens a terminal in this workspace. Try <code>help</code>, <code>ls</code> or <code>git log</code>.</p>
          <p>To customize Run and Debug, <a href="https://github.com/tilalx/tilalx" target="_blank" rel="noopener noreferrer">view the source on GitHub</a>.</p>
        </div>
        <Pane title="Variables" grow={false} expanded={panes.variables} onToggle={toggle('variables')}>
          <div className="list debug-vars">
            <div className="list-row"><span className="tree-lead folder"><Codicon name="chevron-down" /></span><span className="tree-label"><span className="name">Locals</span></span></div>
            {VARIABLES.map(([k, v, type]) => (
              <div key={k} className="list-row" style={{ paddingLeft: 12 }}>
                <span className="tree-lead file" />
                <span className="tree-label">
                  <span className="debug-name">{k}</span>: <span className={`debug-value ${type}`}>{v}</span>
                </span>
              </div>
            ))}
          </div>
        </Pane>
        <Pane title="Watch" grow={false} expanded={panes.watch} onToggle={toggle('watch')} />
        <Pane title="Call Stack" grow={false} expanded={panes.stack} onToggle={toggle('stack')}>
          <div className="pane-message">Not running</div>
        </Pane>
        <Pane title="Breakpoints" grow={false} expanded={panes.breakpoints} onToggle={toggle('breakpoints')}>
          <div className="pane-message">No breakpoints. Life is good.</div>
        </Pane>
      </div>
    </>
  )
}
