'use client'

import { useState } from 'react'
import { pressable } from '../pressable'
import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { ExtensionIcon } from '../editors/ExtensionEditor'
import { Pane, ViewTitle } from './Pane'

/** Tools I use that GitHub's language stats can't see. */
const TOOLS: { name: string; color: string; description: string }[] = [
  { name: 'Docker',     color: '#2496ed', description: 'Containers for everything, including this page.' },
  { name: 'Kubernetes', color: '#326ce5', description: 'When one container host stops being enough.' },
  { name: 'Terraform',  color: '#844fba', description: 'Infrastructure as code for the clouds I touch.' },
  { name: 'Ansible',    color: '#ee0000', description: 'Configuration management for everything else.' },
  { name: 'Jenkins',    color: '#d24939', description: 'CI/CD pipelines, the classic way.' },
  { name: 'Nix',        color: '#7e7eff', description: 'Reproducible environments.' },
]

export default function Extensions() {
  const wb = useWorkbench()
  const [query, setQuery] = useState('')
  const [panes, setPanes] = useState({ installed: true, tools: true })
  const q = query.trim().toLowerCase()
  const languages = wb.data.stack.filter(s => s.name.toLowerCase().includes(q))
  const tools = TOOLS.filter(t => t.name.toLowerCase().includes(q))

  const row = (name: string, color: string, description: string, onClick?: () => void) => (
    <div key={name} className="extension-row" {...(onClick ? pressable(onClick, 'listitem') : { role: 'listitem' })}>
      <ExtensionIcon name={name} color={color} size={42} />
      <div className="extension-row-details">
        <div className="extension-row-header">
          <span className="name">{name}</span>
        </div>
        <div className="extension-row-description">{description}</div>
        <div className="extension-row-footer">
          <span className="publisher"><Codicon name="verified-filled" /> tilalx</span>
          <Codicon name="settings-gear" className="manage" />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <ViewTitle title="Extensions" actions={[
        { icon: 'filter', title: 'Filter Extensions...', run: () => setQuery('') },
        { icon: 'refresh', title: 'Refresh', run: () => location.reload() },
      ]} />
      <div className="sidebar-content">
        <div className="extensions-search">
          <div className="monaco-inputbox">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Extensions in Marketplace" aria-label="Search Extensions" />
          </div>
        </div>
        <Pane title="Installed" expanded={panes.installed} onToggle={() => setPanes(p => ({ ...p, installed: !p.installed }))}>
          <div role="list">
            {languages.map(s => {
              const repos = wb.data.repos.filter(r => r.language === s.name && !r.fork).length
              return row(s.name, s.color, `${repos} public ${repos === 1 ? 'repository' : 'repositories'}`, () => wb.open({ type: 'extension', name: s.name }))
            })}
            {languages.length === 0 && <div className="pane-message">No extensions found.</div>}
          </div>
        </Pane>
        <Pane title="Tooling" expanded={panes.tools} onToggle={() => setPanes(p => ({ ...p, tools: !p.tools }))}>
          <div role="list">{tools.map(t => row(t.name, t.color, t.description))}</div>
        </Pane>
      </div>
    </>
  )
}
