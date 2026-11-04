'use client'

import { useState } from 'react'
import { pressable } from '../pressable'
import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { DEFAULT_SETTINGS, SETTING_SPECS } from '../settings'
import type { SettingSpec, Settings } from '../settings'

function SettingControl({ spec }: { spec: SettingSpec }) {
  const { settings, setSetting } = useWorkbench()
  const value = settings[spec.key]
  const set = (v: unknown) => setSetting(spec.key, v as Settings[typeof spec.key])

  if (spec.type === 'boolean') {
    return (
      <label className="setting-checkbox">
        <input type="checkbox" checked={value as boolean} onChange={e => set(e.target.checked)} />
        <span className="checkbox"><Codicon name="check" /></span>
        <span>{spec.description}</span>
      </label>
    )
  }
  if (spec.type === 'enum') {
    return (
      <select className="setting-select" value={value as string} onChange={e => set(e.target.value)}>
        {spec.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
  return <NumberSetting value={value as number | null} onCommit={set} />
}

/** Keeps the typed text locally so partial input ("1" on the way to "14") isn't rejected; commits valid values. */
function NumberSetting({ value, onCommit }: { value: number | null; onCommit(v: number | null): void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  return (
    <input
      className="setting-input"
      type="number"
      min={6}
      max={40}
      placeholder="default"
      value={draft}
      onChange={e => {
        setDraft(e.target.value)
        const n = e.target.value === '' ? null : Number(e.target.value)
        if (n === null || (n >= 6 && n <= 40)) onCommit(n)
      }}
      onBlur={() => setDraft(value === null ? '' : String(value))}
    />
  )
}

export default function SettingsEditor() {
  const { settings } = useWorkbench()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = SETTING_SPECS.filter(s => !q || `${s.category} ${s.title} ${s.description} ${s.key}`.toLowerCase().includes(q))
  const categories = [...new Set(SETTING_SPECS.map(s => s.category.split(' › ')[0]))]

  return (
    <div className="settings-editor">
      <div className="settings-header">
        <div className="settings-search">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search settings" aria-label="Search settings" />
          <span className="settings-count">{q ? `${shown.length} Settings Found` : ''}</span>
        </div>
        <div className="settings-tabs">
          <span className="settings-tab active">User</span>
          <span className="settings-tab">Workspace</span>
        </div>
      </div>
      <div className="settings-body">
        <nav className="settings-toc">
          <div className="toc-row active" {...pressable(() => document.querySelector('.settings-list')?.scrollTo({ top: 0 }))}>Commonly Used</div>
          {categories.map(c => (
            <div key={c} className="toc-row" {...pressable(() => document.getElementById(`setting-${SETTING_SPECS.find(s => s.category.startsWith(c))!.key}`)?.scrollIntoView({ block: 'start' }))}>
              {c}
            </div>
          ))}
        </nav>
        <div className="settings-list scrollable">
          <h3 className="settings-group-title">Commonly Used</h3>
          {shown.map(spec => {
            const modified = settings[spec.key] !== DEFAULT_SETTINGS[spec.key]
            return (
              <div key={spec.key} id={`setting-${spec.key}`} className={`setting-item${modified ? ' modified' : ''}`}>
                <div className="setting-title">
                  <span className="setting-category">{spec.category}: </span>
                  <span className="setting-label">{spec.title}</span>
                </div>
                {spec.type !== 'boolean' && <div className="setting-description">{spec.description}</div>}
                <div className="setting-value"><SettingControl spec={spec} /></div>
              </div>
            )
          })}
          {shown.length === 0 && <div className="setting-description">No Settings Found</div>}
        </div>
      </div>
    </div>
  )
}
