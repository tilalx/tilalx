'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { TABS, THEMES } from './ide/constants'
import { stripQuotes, parseTags, getFileColor, runTerminalCommand, pickMemeUrl } from './ide/utils'
import { IconSettings } from './ide/icons'
import ActivityBar from './ide/ActivityBar'
import Sidebar from './ide/Sidebar'
import ReadmeEditor from './ide/ReadmeEditor'
import MemesEditor from './ide/MemesEditor'
import QuotesEditor from './ide/QuotesEditor'
import SettingsUI from './ide/SettingsUI'
import CodeViewer from './ide/CodeViewer'
import LivePreview from './ide/LivePreview'
import { ProblemsPanel } from './ide/Terminal'
import TerminalView from './ide/XTermPanel'
import StatusBar from './ide/StatusBar'
import PreviewSheet from './ide/PreviewSheet'
import CommandPalette from './ide/CommandPalette'


const IconPanel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M15 3v18"/>
  </svg>
)

function MobileHeader({ activeTab, openFile, onDrawer, onSheet, onSettings }) {
  const tab = TABS.find(t => t.id === activeTab) || TABS[0]
  const label = openFile ? openFile.split('/').pop() : tab.label
  const color = openFile ? getFileColor(openFile) : tab.color
  return (
    <div className="ide-mobile-header">
      <button className="ide-mobile-icon-btn" onClick={onDrawer} aria-label="Explorer">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </button>
      <div className="ide-mobile-title">
        <span className="ide-file-dot" style={{ background: color }} />
        {label}
      </div>
      <button className="ide-mobile-icon-btn" onClick={onSettings} aria-label="Settings"><IconSettings /></button>
      <button className="ide-mobile-icon-btn" onClick={onSheet} aria-label="Live Preview"><IconPanel /></button>
    </div>
  )
}

function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="ide-mobile-nav" aria-label="Tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`ide-mobile-nav-btn${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="ide-mobile-nav-dot" style={{ background: tab.color }} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Drawer({ open, onClose, activeTab, openFile, onTabChange, onOpenFile, repos, fileTree }) {
  return (
    <>
      <div className={`ide-drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-drawer${open ? ' open' : ''}`} inert={!open}>
        <Sidebar
          activityView="explorer"
          activeTab={activeTab}
          openFile={openFile}
          onTabChange={id => { onTabChange(id); onClose() }}
          onOpenFile={(fp, ln) => { onOpenFile(fp, ln); onClose() }}
          repos={repos}
          fileTree={fileTree}
          stack={[]}
          commits={[]}
          commitsLoading={false}
          settings={{}}
          fileContents={null}
        />
      </div>
    </>
  )
}

export default function IDEApp({ initialQuotes = [], initialMemes = [], initialCommits = [], repos, stack, fileTree = [], fileContents, readmeContent }) {
  const [activeTab,      setActiveTab]      = useState('readme')
  const [activityActive, setActivityActive] = useState('explorer')
  const [bottomTab,      setBottomTab]      = useState('terminal')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [sheetOpen,      setSheetOpen]      = useState(false)

  // ── Workbench layout: terminals (split groups), panel, sidebar — persisted ─
  // A terminal "group" is a split: { id, name, panes: number[] }.
  // Defaults render on the server; persisted state is hydrated on mount (below)
  // to avoid SSR/client markup mismatches on the inline width/height.
  const [terminals,        setTerminals]        = useState([{ id: 1, name: 'fish', panes: [1] }])
  const [activeTerminalId, setActiveTerminalId] = useState(1)
  const [panelHeight,      setPanelHeight]      = useState(230)
  const [panelMaximized,   setPanelMaximized]   = useState(false)
  const [panelCollapsed,   setPanelCollapsed]   = useState(false)
  const [sidebarWidth,     setSidebarWidth]     = useState(240)
  const [sidebarVisible,   setSidebarVisible]   = useState(true)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState('files')
  const openPalette = useCallback((mode) => { setPaletteMode(mode); setPaletteOpen(true) }, [])

  const termIdRef    = useRef(2)
  const paneIdRef    = useRef(2)

  const terminalsRef        = useRef(terminals)
  const activeTerminalIdRef = useRef(activeTerminalId)
  const panelHeightRef      = useRef(panelHeight)
  const sidebarWidthRef     = useRef(sidebarWidth)
  useEffect(() => { terminalsRef.current        = terminals        }, [terminals])
  useEffect(() => { activeTerminalIdRef.current = activeTerminalId }, [activeTerminalId])
  useEffect(() => { panelHeightRef.current      = panelHeight      }, [panelHeight])
  useEffect(() => { sidebarWidthRef.current     = sidebarWidth     }, [sidebarWidth])

  // Hydrate persisted workbench layout once, after mount.
  useEffect(() => {
    let w
    try { w = JSON.parse(localStorage.getItem('ide-workbench') || '{}') } catch { return }
    if (typeof w.panelHeight === 'number')     setPanelHeight(w.panelHeight)
    if (typeof w.panelMaximized === 'boolean') setPanelMaximized(w.panelMaximized)
    if (typeof w.panelCollapsed === 'boolean') setPanelCollapsed(w.panelCollapsed)
    if (typeof w.sidebarWidth === 'number')    setSidebarWidth(w.sidebarWidth)
    if (typeof w.sidebarVisible === 'boolean') setSidebarVisible(w.sidebarVisible)
    if (Array.isArray(w.terminals) && w.terminals.length) {
      const valid = w.terminals.filter(t => t && Array.isArray(t.panes) && t.panes.length)
      if (valid.length) {
        setTerminals(valid)
        termIdRef.current = Math.max(0, ...valid.map(t => t.id)) + 1
        paneIdRef.current = Math.max(0, ...valid.flatMap(t => t.panes)) + 1
        setActiveTerminalId(valid.some(t => t.id === w.activeTerminalId) ? w.activeTerminalId : valid.at(-1).id)
      }
    }
  }, [])

  // Persist on change (skip the initial commit so we don't clobber storage).
  const firstWriteRef = useRef(true)
  useEffect(() => {
    if (firstWriteRef.current) { firstWriteRef.current = false; return }
    const data = { terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible }
    try { localStorage.setItem('ide-workbench', JSON.stringify(data)) } catch {}
  }, [terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible])

  const addTerminal = useCallback(() => {
    const id = termIdRef.current++
    const paneId = paneIdRef.current++
    setTerminals(p => [...p, { id, name: `fish ${p.length + 1}`, panes: [paneId] }])
    setActiveTerminalId(id)
    setBottomTab('terminal'); setPanelCollapsed(false)
  }, [])

  const splitTerminal = useCallback(() => {
    const targetId = activeTerminalIdRef.current
    const groups = terminalsRef.current
    if (!groups.length || !groups.some(g => g.id === targetId)) { addTerminal(); return }
    const paneId = paneIdRef.current++
    setTerminals(prev => prev.map(g => g.id === targetId ? { ...g, panes: [...g.panes, paneId] } : g))
    setBottomTab('terminal'); setPanelCollapsed(false)
  }, [addTerminal])

  const closeTerminal = useCallback((id) => {
    const remaining = terminalsRef.current.filter(t => t.id !== id)
    setTerminals(remaining)
    setActiveTerminalId(cur => (cur === id ? (remaining.at(-1)?.id ?? null) : cur))
  }, [])

  // Per-pane close button only renders when a group has >1 pane, so the result
  // always keeps at least one pane.
  const closePane = useCallback((groupId, paneId) => {
    setTerminals(prev => prev.map(g => g.id === groupId ? { ...g, panes: g.panes.filter(p => p !== paneId) } : g))
  }, [])

  const renameTerminal = useCallback((id, name) => {
    setTerminals(prev => prev.map(g => g.id === id ? { ...g, name } : g))
  }, [])

  const startPanelResize = useCallback((e) => {
    if (panelMaximized || panelCollapsed) return
    e.preventDefault()
    const startY = e.clientY
    const startH = panelHeightRef.current
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev) => {
      const next = startH + (startY - ev.clientY)
      setPanelHeight(Math.min(Math.max(next, 80), window.innerHeight - 160))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [panelMaximized, panelCollapsed])

  const startSidebarResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidthRef.current
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev) => setSidebarWidth(Math.min(Math.max(startW + (ev.clientX - startX), 150), 500))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const [openFile,      setOpenFile]      = useState(null)
  const [openFileLine,  setOpenFileLine]  = useState(null)
  const [memeTabViewed, setMemeTabViewed] = useState(false)

  const ideRootRef      = useRef(null)
  const seenMemeUrls    = useRef(new Set(initialMemes.map(m => m.url)))
  const memeQueue       = useRef(initialMemes.slice(1))
  const quoteQueue      = useRef(initialQuotes.slice(1))
  const preloadedUrlRef = useRef('')

  const preloadNextMeme = useCallback(() => {
    const next = memeQueue.current[0]?.url
    if (next && next !== preloadedUrlRef.current) {
      preloadedUrlRef.current = next
      const img = new window.Image()
      img.src = next
    }
  }, [])

  const [memeUrl,      setMemeUrl]      = useState(initialMemes[0]?.url  || '')
  const [memeThumbUrl, setMemeThumbUrl] = useState(initialMemes[0]?.thumb || '')
  const [memeLoading,  setMemeLoading]  = useState(initialMemes.length === 0)

  const [quote,        setQuote]        = useState(initialQuotes[0] || null)
  const [quoteLoading, setQuoteLoading] = useState(initialQuotes.length === 0)

  const [networkLog, setNetworkLog] = useState([])
  const addLog = useCallback((url, ok, ms) => {
    setNetworkLog(prev => [{ url, ok, ms }, ...prev].slice(0, 50))
  }, [])

  // Defaults render on both server and first client paint; persisted values are
  // hydrated on mount to avoid SSR/client hydration mismatches (the server has
  // no access to localStorage, so it must match the default first render).
  const [settings, setSettings] = useState({ 'memes.autoPlay': false, 'memes.interval': 10, 'editor.fontSize': 13, 'network.showLog': true })
  const setSetting = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ide-settings') || '{}')
      if (saved && typeof saved === 'object') setSettings(p => ({ ...p, ...saved }))
    } catch {}
  }, [])

  const settingsFirstWrite = useRef(true)
  useEffect(() => {
    if (settingsFirstWrite.current) { settingsFirstWrite.current = false; return }
    const str = JSON.stringify(settings)
    try { localStorage.setItem('ide-settings', str) } catch {}
    document.cookie = `ide-settings=${encodeURIComponent(str)}; path=/; max-age=31536000; SameSite=Lax`
  }, [settings])

  const [commits,        setCommits]        = useState(initialCommits)
  const [commitsLoading, setCommitsLoading] = useState(false)
  const [commitsFetched, setCommitsFetched] = useState(initialCommits.length > 0)



  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const ms = 60000 - (Date.now() % 60000)
    const t = setTimeout(() => { tick(); setInterval(tick, 60000) }, ms)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--ide-font-size', `${settings['editor.fontSize']}px`)
  }, [settings['editor.fontSize']])

  useEffect(() => {
    const vars = THEMES[settings['workbench.colorTheme']] || THEMES['Catppuccin Mocha']
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
  }, [settings['workbench.colorTheme']])

  const fetchCommits = useCallback(async () => {
    if (commitsFetched) return
    setCommitsLoading(true)
    setCommitsFetched(true)
    try {
      const res = await fetch('https://api.github.com/repos/tilalx/tilalx/commits?per_page=15')
      const data = await res.json()
      setCommits(Array.isArray(data) ? data : [])
    } catch {
      setCommits([])
    } finally {
      setCommitsLoading(false)
    }
  }, [commitsFetched])

  const handleOpenFile = useCallback((filepath, line) => {
    setOpenFile(filepath)
    setOpenFileLine(line || null)
    setActiveTab('file')
  }, [])

  const refillMemeQueue = useCallback(async () => {
    try {
      const res   = await fetch('https://meme-api.aelx.de/gimme/10')
      const data  = await res.json()
      const items = (data.memes || [])
        .filter(m => m.url && !seenMemeUrls.current.has(m.url))
        .map(m => ({ url: m.url, thumb: pickMemeUrl(m.preview, m.url) }))
      items.forEach(({ url }) => {
        seenMemeUrls.current.add(url)
        if (seenMemeUrls.current.size > 100)
          seenMemeUrls.current.delete(seenMemeUrls.current.values().next().value)
      })
      memeQueue.current = [...memeQueue.current, ...items]
      preloadNextMeme()
    } catch {}
  }, [preloadNextMeme])

  const refillQuoteQueue = useCallback(async () => {
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=10', { cache: 'no-store' })
      const data = await res.json()
      quoteQueue.current = [
        ...quoteQueue.current,
        ...(data || []).map(q => ({ content: stripQuotes(q.content), author: q.author, tags: parseTags(q.tags) })),
      ]
    } catch {}
  }, [])

  const fetchMeme = useCallback(async () => {
    if (memeQueue.current.length < 3) refillMemeQueue()
    const queued = memeQueue.current.shift()
    preloadNextMeme()
    if (queued) {
      setMemeUrl(queued.url)
      setMemeThumbUrl(queued.thumb)
      addLog('meme-api.aelx.de/gimme', true, 0)
      return
    }
    setMemeLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://meme-api.aelx.de/gimme')
      const data = await res.json()
      const url  = data.url || ''
      if (url) {
        setMemeUrl(url)
        setMemeThumbUrl(pickMemeUrl(data.preview, url))
        addLog('meme-api.aelx.de/gimme', true, Date.now() - t)
      } else addLog('meme-api.aelx.de/gimme', false, Date.now() - t)
    } catch {
      setMemeUrl('')
      addLog('meme-api.aelx.de/gimme', false, Date.now() - t)
    } finally { setMemeLoading(false) }
  }, [addLog, refillMemeQueue, preloadNextMeme])

  const fetchQuote = useCallback(async () => {
    if (quoteQueue.current.length < 3) refillQuoteQueue()
    const queued = quoteQueue.current.shift()
    if (queued) {
      setQuote(queued)
      addLog('quotes.aelx.de/random', true, 0)
      return
    }
    setQuoteLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
      const data = await res.json()
      if (data?.length > 0) {
        setQuote({ content: stripQuotes(data[0].content), author: data[0].author, tags: parseTags(data[0].tags) })
        addLog('quotes.aelx.de/random', true, Date.now() - t)
      }
    } catch {
      addLog('quotes.aelx.de/random', false, Date.now() - t)
    } finally { setQuoteLoading(false) }
  }, [addLog, refillQuoteQueue])

  useEffect(() => {
    if (initialMemes.length === 0) fetchMeme()
    else if (memeQueue.current.length < 3) refillMemeQueue()
    if (initialQuotes.length === 0) fetchQuote()
    else if (quoteQueue.current.length < 3) refillQuoteQueue()
    fetchCommits()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumb = activeTab === 'settings'
    ? 'settings.json'
    : activeTab === 'file' && openFile
    ? openFile
    : TABS.find(t => t.id === activeTab)?.label || 'README.md'

  const handleActivitySelect = (id) => {
    // Clicking the already-active view toggles the side bar (VS Code behavior).
    if (id === activityActive && id !== 'settings') { setSidebarVisible(v => !v); return }
    if (id === 'git' && !commitsFetched) fetchCommits()
    if (id === 'settings') setActiveTab('settings')
    setSidebarVisible(true)
    setActivityActive(id)
  }

  const handleCycleTab = () => {
    const ids = TABS.map(t => t.id)
    const idx = ids.indexOf(activeTab)
    setActiveTab(ids[(idx + 1) % ids.length])
    setOpenFile(null)
  }

  const closeActiveEditor = useCallback(() => {
    if (openFile) { setActiveTab('readme'); setOpenFile(null) }
    else if (activeTab === 'settings') { setActiveTab('readme'); setActivityActive('explorer') }
  }, [openFile, activeTab])

  // ── Command Palette sources ───────────────────────────────────────────────
  const filePaths = useMemo(() => Object.keys(fileContents || {}), [fileContents])
  const paletteCommands = useMemo(() => [
    { id: 'term-new',     label: 'Terminal: Create New Terminal', hint: 'Ctrl+Shift+`', run: addTerminal },
    { id: 'term-split',   label: 'Terminal: Split Terminal',                            run: splitTerminal },
    { id: 'view-panel',   label: 'View: Toggle Panel',            hint: 'Ctrl+`',       run: () => setPanelCollapsed(c => !c) },
    { id: 'view-sidebar', label: 'View: Toggle Primary Side Bar', hint: 'Ctrl+B',       run: () => setSidebarVisible(v => !v) },
    { id: 'view-maxpanel',label: 'View: Toggle Maximized Panel',                        run: () => { setPanelMaximized(m => !m); setPanelCollapsed(false) } },
    { id: 'pref-settings',label: 'Preferences: Open Settings',                          run: () => { setActiveTab('settings'); setActivityActive('settings') } },
    { id: 'go-readme',    label: 'Go to File: README.md',                               run: () => { setActiveTab('readme'); setOpenFile(null) } },
    { id: 'go-memes',     label: 'Go to File: memes.feed',                              run: () => { setActiveTab('memes'); setOpenFile(null); setMemeTabViewed(true) } },
    { id: 'go-quotes',    label: 'Go to File: quotes.log',                              run: () => { setActiveTab('quotes'); setOpenFile(null) } },
    ...Object.keys(THEMES).map(name => ({ id: `theme-${name}`, label: `Preferences: Color Theme — ${name}`, run: () => setSetting('workbench.colorTheme', name) })),
    { id: 'net-log',      label: 'Network: Toggle Request Log',                         run: () => setSetting('network.showLog', !settings['network.showLog']) },
  ], [addTerminal, splitTerminal, setSetting, settings])

  // ── Global keybindings (VS Code-style) ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      switch (key) {
        case 'p':       e.preventDefault(); openPalette(e.shiftKey ? 'commands' : 'files'); break
        case '`':       e.preventDefault(); setPanelCollapsed(c => !c); setBottomTab('terminal'); break
        case '~':       e.preventDefault(); addTerminal(); break // Ctrl+Shift+`
        case 'j':       e.preventDefault(); setPanelCollapsed(c => !c); break
        case 'b':       e.preventDefault(); setSidebarVisible(v => !v); break
        case 'w':       if (openFile || activeTab === 'settings') { e.preventDefault(); closeActiveEditor() } break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPalette, addTerminal, closeActiveEditor, openFile, activeTab])

  return (
    <div className="ide-root" ref={ideRootRef}>
      <MobileHeader
        activeTab={activeTab}
        openFile={openFile}
        onDrawer={() => setDrawerOpen(true)}
        onSheet={() => setSheetOpen(true)}
        onSettings={() => { setActiveTab('settings'); setOpenFile(null) }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        openFile={openFile}
        onTabChange={id => { setActiveTab(id); setOpenFile(null) }}
        onOpenFile={handleOpenFile}
        repos={repos}
        fileTree={fileTree}
      />
      <PreviewSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        memeUrl={memeTabViewed ? memeUrl : memeThumbUrl} memeLoading={memeLoading}
        quote={quote} quoteLoading={quoteLoading}
        networkLog={networkLog}
        showLog={settings['network.showLog']}
      />

      <div className="ide-main">
        <ActivityBar active={activityActive} onSelect={handleActivitySelect} />
        {sidebarVisible && (
          <div className="ide-sidebar-host" style={{ width: sidebarWidth }}>
            <Sidebar
              activityView={activityActive}
              activeTab={activeTab}
              openFile={openFile}
              onTabChange={id => { setActiveTab(id); setOpenFile(null) }}
              onOpenFile={handleOpenFile}
              repos={repos}
              fileTree={fileTree}
              stack={stack}
              commits={commits}
              commitsLoading={commitsLoading}
              settings={settings}
              fileContents={fileContents}
            />
            <div
              className="ide-sidebar-resize-handle"
              onPointerDown={startSidebarResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize side bar"
            />
          </div>
        )}

        <div className="ide-editor-center">
        <div className="ide-editor-wrap">
          <div className="ide-tab-bar">
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`ide-tab${activeTab === tab.id && !openFile ? ' active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setOpenFile(null); if (tab.id === 'memes') setMemeTabViewed(true) }}
                onMouseEnter={() => { if (tab.id === 'memes' && memeUrl) { const img = new window.Image(); img.src = memeUrl } }}
              >
                <span className="ide-tab-dot" style={{ background: tab.color }} />
                {tab.label}
                <span className="ide-tab-close">×</span>
              </div>
            ))}
            {activeTab === 'settings' && (
              <div className="ide-tab active">
                <span style={{ display: 'flex', alignItems: 'center', marginRight: 4, opacity: 0.7 }}><IconSettings /></span>
                settings.json
                <span className="ide-tab-close" style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setActiveTab('readme'); setActivityActive('explorer') }}>×</span>
              </div>
            )}
            {activeTab === 'file' && openFile && (
              <div className="ide-tab active">
                <span className="ide-tab-dot" style={{ background: getFileColor(openFile) }} />
                {openFile.split('/').pop()}
                <span className="ide-tab-close" style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setActiveTab('readme'); setOpenFile(null) }}>×</span>
              </div>
            )}
          </div>

          <div className="ide-breadcrumb">
            <span>tilalx</span>
            <span className="ide-breadcrumb-sep">›</span>
            <span className="ide-breadcrumb-active">{breadcrumb}</span>
          </div>

          {activeTab === 'readme'   && !openFile && (readmeContent ?? <ReadmeEditor repos={repos} stack={stack} />)}
          {activeTab === 'memes'    && !openFile && (
            <MemesEditor
              memeUrl={memeUrl} memeLoading={memeLoading} onNext={fetchMeme}
              autoPlay={settings['memes.autoPlay']}
              interval={settings['memes.interval']}
              onAutoPlayChange={v => setSetting('memes.autoPlay', v)}
              onIntervalChange={v => setSetting('memes.interval', v)}
            />
          )}
          {activeTab === 'quotes'   && !openFile && <QuotesEditor quote={quote} loading={quoteLoading} onNext={fetchQuote} />}
          {activeTab === 'settings' && !openFile && <SettingsUI settings={settings} setSetting={setSetting} />}
          {activeTab === 'file'     && openFile  && (
            <CodeViewer
              filename={openFile}
              content={fileContents?.[openFile] || `// could not read ${openFile}`}
              scrollToLine={openFileLine}
            />
          )}
        </div>

          <div
            className={`ide-bottom-panel${panelMaximized ? ' maximized' : ''}${panelCollapsed ? ' collapsed' : ''}`}
            style={panelMaximized || panelCollapsed ? undefined : { height: panelHeight }}
          >
            <div
              className="ide-panel-resize-handle"
              onPointerDown={startPanelResize}
              onDoubleClick={() => { setPanelMaximized(m => !m); setPanelCollapsed(false) }}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize panel"
            />
            <div className="ide-bottom-tabs">
              {[
                { id: 'problems',      label: 'Problems'      },
                { id: 'output',        label: 'Output'        },
                { id: 'debug-console', label: 'Debug Console' },
                { id: 'terminal',      label: 'Terminal', badge: terminals.length > 1 ? String(terminals.length) : null },
                { id: 'ports',         label: 'Ports', badge: '3' },
              ].map(t => (
                <div
                  key={t.id}
                  className={`ide-bottom-tab${bottomTab === t.id ? ' active' : ''}`}
                  onClick={() => setBottomTab(t.id)}
                >
                  {t.label}
                  {t.badge && <span className="ide-bottom-tab-badge">{t.badge}</span>}
                </div>
              ))}
              <div className="ide-bottom-actions">
                <button className="ide-bottom-action-btn" title="New Terminal" aria-label="New Terminal" onClick={addTerminal}>+</button>
                <button className="ide-bottom-action-btn" title="Split Terminal" aria-label="Split Terminal" onClick={splitTerminal}>⧉</button>
                <button
                  className="ide-bottom-action-btn"
                  title={panelMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
                  aria-label={panelMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
                  onClick={() => { setPanelMaximized(m => !m); setPanelCollapsed(false) }}
                >{panelMaximized ? '▭' : '□'}</button>
                <button
                  className="ide-bottom-action-btn"
                  title={panelCollapsed ? 'Restore Panel' : 'Hide Panel'}
                  aria-label={panelCollapsed ? 'Restore Panel' : 'Hide Panel'}
                  onClick={() => setPanelCollapsed(c => !c)}
                >{panelCollapsed ? '⌃' : '⌄'}</button>
                <button
                  className="ide-bottom-action-btn"
                  title="Kill Active Terminal"
                  aria-label="Kill Active Terminal"
                  onClick={() => { if (bottomTab === 'terminal' && activeTerminalId != null) closeTerminal(activeTerminalId) }}
                >×</button>
              </div>
            </div>
            {!panelCollapsed && bottomTab !== 'terminal' && (
              <div className="ide-panel-content">
                {bottomTab === 'problems'      && <ProblemsPanel repos={repos} />}
                {bottomTab === 'output'        && <div className="ide-bottom-empty">No output available.</div>}
                {bottomTab === 'debug-console' && <div className="ide-bottom-empty">No debug sessions active.</div>}
                {bottomTab === 'ports'         && <div className="ide-bottom-empty">No ports forwarded.</div>}
              </div>
            )}
            <div style={{ display: !panelCollapsed && bottomTab === 'terminal' ? 'flex' : 'none', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <TerminalView
                groups={terminals}
                activeId={activeTerminalId}
                isActive={!panelCollapsed && bottomTab === 'terminal'}
                onAdd={addTerminal}
                onSelect={setActiveTerminalId}
                onClose={closeTerminal}
                onClosePane={closePane}
                onRename={renameTerminal}
                repos={repos} stack={stack} commits={commits} fileTree={fileTree}
              />
            </div>
          </div>
        </div>

        <div className="ide-right-panel">
          <div className="ide-panel-tabs">
            <div className="ide-panel-tab active">Live Preview</div>
          </div>
          <LivePreview
            memeUrl={memeTabViewed ? memeUrl : memeThumbUrl} memeLoading={memeLoading}
            quote={quote} quoteLoading={quoteLoading}
            networkLog={networkLog} showLog={settings['network.showLog']}
          />
        </div>
      </div>

      <MobileNav activeTab={activeTab} onTabChange={id => { setActiveTab(id); setOpenFile(null) }} />

      <StatusBar
        tab={activeTab}
        openFile={openFile}
        repos={repos}
        clock={clock}
        onOpenGit={() => { setActivityActive('git'); if (!commitsFetched) fetchCommits() }}
        onOpenExplorer={() => setActivityActive('explorer')}
        setPanelTab={() => {}}
        onCycleTab={handleCycleTab}
      />

      <CommandPalette
        open={paletteOpen}
        initialMode={paletteMode}
        files={filePaths}
        commands={paletteCommands}
        onOpenFile={handleOpenFile}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  )
}
