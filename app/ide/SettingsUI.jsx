'use client'

import { useState } from 'react'
import { SETTINGS_DEF } from './constants'
import { syntaxHighlight } from './syntax'

export function SettingsSidebarHint({ settings }) {
  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Settings</div>
      <div className="ide-section">
        <div className="ide-section-header" style={{ cursor: 'default' }}>Current values</div>
        {Object.entries(settings).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 12px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', gap: 8 }}>
            <span style={{ color: '#6c7086', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
            <span style={{ color: typeof v === 'boolean' ? (v ? '#a6e3a1' : '#f38ba8') : '#f9e2af', flexShrink: 0 }}>{String(v)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 12px', fontSize: 10, color: '#45475a', fontFamily: 'JetBrains Mono, monospace' }}>
        Edit in the Settings tab · saved to localStorage
      </div>
    </div>
  )
}

export default function SettingsUI({ settings, setSetting }) {
  const [jsonView, setJsonView]     = useState(false)
  const [activeTab, setActiveTab]   = useState('User')
  const [activeGroup, setActiveGroup] = useState('Commonly Used')
  const [search, setSearch]         = useState('')
  const jsonStr = JSON.stringify(settings, null, 2)

  const visibleGroups = search.trim()
    ? SETTINGS_DEF.map(g => ({
        ...g,
        items: g.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.desc.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : SETTINGS_DEF.filter(g => g.group === activeGroup)

  return (
    <div className="ide-settings-root">
      <div className="ide-settings-topbar">
        <div className="ide-settings-tabs">
          {['User', 'Workspace'].map(t => (
            <button key={t} className={`ide-settings-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
          <button
            className={`ide-settings-view-btn${jsonView ? ' active' : ''}`}
            onClick={() => setJsonView(v => !v)}
            title={jsonView ? 'Switch to UI' : 'Open as JSON'}
          >{ jsonView ? '⊞ UI' : '{ } JSON' }</button>
        </div>
        <div className="ide-settings-search-wrap">
          <svg className="ide-settings-search-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
          <input
            className="ide-settings-search"
            placeholder="Search settings"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {jsonView ? (
        <div className="ide-editor-scroll" style={{ flex: 1 }}>
          <pre className="ide-settings-json-view"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonStr, 'json') }}
          />
        </div>
      ) : (
        <div className="ide-settings-body">
          <nav className="ide-settings-nav">
            {SETTINGS_DEF.map(g => (
              <button
                key={g.group}
                className={`ide-settings-nav-item${activeGroup === g.group ? ' active' : ''}`}
                onClick={() => { setActiveGroup(g.group); setSearch('') }}
              >
                <span className="ide-settings-nav-chevron">›</span>
                {g.group}
              </button>
            ))}
          </nav>

          <div className="ide-editor-scroll ide-settings-content">
            {visibleGroups.map(group => (
              <div key={group.group} className="ide-settings-group">
                {search && <div className="ide-settings-group-title">{group.group}</div>}
                {group.items.map(item => (
                  <div key={item.key} className="ide-settings-row-ui">
                    <div className="ide-settings-row-label">
                      <span className="ide-settings-row-group">{group.group}: </span>
                      <strong>{item.label}</strong>
                    </div>
                    <div className="ide-settings-row-desc">{item.desc}</div>
                    <div className="ide-settings-row-ctrl">
                      {item.type === 'bool' ? (
                        <label className="ide-checkbox-wrap">
                          <input
                            type="checkbox"
                            className="ide-checkbox"
                            checked={!!settings[item.key]}
                            onChange={e => setSetting(item.key, e.target.checked)}
                          />
                          <span className="ide-checkbox-label">{item.desc.split('.')[0]}</span>
                        </label>
                      ) : item.type === 'select' ? (
                        <select
                          className="ide-settings-select"
                          value={settings[item.key] ?? item.options[0]}
                          onChange={e => setSetting(item.key, e.target.value)}
                        >
                          {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type="number"
                          className="ide-settings-input"
                          value={settings[item.key] ?? item.min}
                          min={item.min}
                          max={item.max}
                          onChange={e => setSetting(item.key, Number(e.target.value))}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
