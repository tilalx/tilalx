'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { SETTINGS_DEF, SETTINGS_DEFAULTS } from './constants'
import { syntaxHighlight } from './syntax'

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M9.1 4.4 8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.8-.8-1.3-2 .3-.7 2.4-.5V7.4L13.6 7l-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
  </svg>
)

function GearMenu({ modified, onReset, onCopy }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div className={`ide-settings-gear-wrap${open ? ' open' : ''}`} ref={ref}>
      <button className="ide-settings-gear" title="More Actions…" aria-label="More Actions" onClick={() => setOpen(o => !o)}>
        <GearIcon />
      </button>
      {open && (
        <div className="ide-settings-gear-menu" role="menu">
          <button
            role="menuitem"
            disabled={!modified}
            onClick={() => { onReset(); setOpen(false) }}
          >Reset Setting</button>
          <button role="menuitem" onClick={() => { onCopy(); setOpen(false) }}>Copy Setting ID</button>
        </div>
      )}
    </div>
  )
}

function SettingControl({ item, value, onChange }) {
  if (item.type === 'bool') {
    return (
      <label className="ide-checkbox-wrap">
        <input
          type="checkbox"
          className="ide-checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="ide-checkbox-label">{item.boolLabel || item.desc.split('.')[0]}</span>
      </label>
    )
  }
  if (item.type === 'select') {
    const idx = item.options.indexOf(value)
    return (
      <>
        <select className="ide-settings-select" value={value} onChange={e => onChange(e.target.value)}>
          {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {item.enumDescs?.[idx] && <div className="ide-settings-enumdesc">{item.enumDescs[idx]}</div>}
      </>
    )
  }
  return (
    <input
      type="number"
      className="ide-settings-input"
      value={value}
      min={item.min}
      max={item.max}
      onChange={e => onChange(Number(e.target.value))}
    />
  )
}

export default function SettingsUI({ settings, setSetting }) {
  const [jsonView,     setJsonView]     = useState(false)
  const [activeTab,    setActiveTab]    = useState('User')
  const [activeGroup,  setActiveGroup]  = useState(SETTINGS_DEF[0].group)
  const [search,       setSearch]       = useState('')
  const [modifiedOnly, setModifiedOnly] = useState(false)

  const scrollRef   = useRef(null)
  const sectionRefs = useRef({})
  const navClickRef = useRef(false)

  const valueOf    = (key) => settings[key] ?? SETTINGS_DEFAULTS[key]
  const isModified = (key) => settings[key] !== undefined && settings[key] !== SETTINGS_DEFAULTS[key]

  const q = search.trim().toLowerCase()
  const filteredGroups = useMemo(() =>
    SETTINGS_DEF.map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (modifiedOnly && !isModified(item.key)) return false
        if (!q) return true
        return item.label.toLowerCase().includes(q)
          || item.desc.toLowerCase().includes(q)
          || item.key.toLowerCase().includes(q)
      }),
    })).filter(g => g.items.length > 0),
  [q, modifiedOnly, settings]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalFound = filteredGroups.reduce((n, g) => n + g.items.length, 0)
  const filtering  = !!q || modifiedOnly
  const presentGroups = new Set(filteredGroups.map(g => g.group))

  // Scroll-spy: highlight the TOC entry of the section nearest the top.
  useEffect(() => {
    const root = scrollRef.current
    if (!root || jsonView) return
    const onScroll = () => {
      if (navClickRef.current) return
      const top = root.getBoundingClientRect().top
      let current = filteredGroups[0]?.group
      for (const g of filteredGroups) {
        const el = sectionRefs.current[g.group]
        if (el && el.getBoundingClientRect().top - top <= 12) current = g.group
      }
      if (current) setActiveGroup(current)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => root.removeEventListener('scroll', onScroll)
  }, [filteredGroups, jsonView])

  const scrollToGroup = (group) => {
    if (!presentGroups.has(group)) return
    setActiveGroup(group)
    navClickRef.current = true
    sectionRefs.current[group]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => { navClickRef.current = false }, 600)
  }

  const copyId = (key) => { try { navigator.clipboard?.writeText(key) } catch {} }

  const jsonStr = JSON.stringify(settings, null, 2)

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
            title={jsonView ? 'Switch to UI' : 'Open Settings (JSON)'}
          >{ jsonView ? '⊞ UI' : '{ } JSON' }</button>
        </div>
        <div className="ide-settings-search-row">
          <div className="ide-settings-search-wrap">
            <svg className="ide-settings-search-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/></svg>
            <input
              className="ide-settings-search"
              placeholder="Search settings"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              className={`ide-settings-filter-btn${modifiedOnly ? ' active' : ''}`}
              title="Show modified settings only"
              aria-label="Show modified settings only"
              onClick={() => setModifiedOnly(m => !m)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12l-4.5 5.5V13L6.5 11V8.5L2 3z"/></svg>
            </button>
            {(search || modifiedOnly) && (
              <button className="ide-settings-search-clear" title="Clear" aria-label="Clear search" onClick={() => { setSearch(''); setModifiedOnly(false) }}>×</button>
            )}
          </div>
          {filtering && <span className="ide-settings-count">{totalFound} Setting{totalFound === 1 ? '' : 's'} Found</span>}
        </div>
      </div>

      {jsonView ? (
        <div className="ide-settings-json-scroll">
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
                className={`ide-settings-nav-item${activeGroup === g.group ? ' active' : ''}${filtering && !presentGroups.has(g.group) ? ' empty' : ''}`}
                onClick={() => scrollToGroup(g.group)}
              >
                <span className="ide-settings-nav-chevron">›</span>
                {g.group}
              </button>
            ))}
          </nav>

          <div className="ide-settings-content" ref={scrollRef}>
            {totalFound === 0 && (
              <div className="ide-settings-noresults">No settings found{modifiedOnly ? ' (no settings differ from their default)' : ''}.</div>
            )}
            {filteredGroups.map(group => (
              <section
                key={group.group}
                className="ide-settings-section"
                ref={el => { sectionRefs.current[group.group] = el }}
              >
                <h2 className="ide-settings-section-title">{group.group}</h2>
                {group.items.map(item => {
                  const modified = isModified(item.key)
                  return (
                    <div key={`${group.group}-${item.key}`} className={`ide-settings-row-ui${modified ? ' modified' : ''}`}>
                      <GearMenu
                        modified={modified}
                        onReset={() => setSetting(item.key, SETTINGS_DEFAULTS[item.key])}
                        onCopy={() => copyId(item.key)}
                      />
                      <div className="ide-settings-row-label">
                        <span className="ide-settings-row-group">{group.group}: </span>
                        <strong>{item.label}</strong>
                        {modified && <span className="ide-settings-modified-pill">Modified</span>}
                      </div>
                      <div className="ide-settings-row-id">{item.key}</div>
                      <div className="ide-settings-row-desc">{item.desc}</div>
                      <div className="ide-settings-row-ctrl">
                        <SettingControl item={item} value={valueOf(item.key)} onChange={v => setSetting(item.key, v)} />
                      </div>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
