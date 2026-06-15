'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { TABS, THEMES } from './ide/constants'
import { stripQuotes, parseTags, getFileColor, runTerminalCommand, pickMemeUrl } from './ide/utils'
import {
  initialEditorState, activeGroupOf, activeTabOf, openInGroup, closeTab, closeOthers,
  closeAll, closeGroup, setPinned, setActiveTab, focusGroup, focusGroupByIndex, moveTab, moveTabToNewGroup,
  splitGroup, cycleTab, mruSwitch, serializeEditor, deserializeEditor,
} from './ide/editor'
import ContextMenu from './ide/ContextMenu'
import Breadcrumb from './ide/Breadcrumb'
import SecondaryBar from './ide/SecondaryBar'
import { useChat } from './ide/useChat'
import { parseSymbols } from './ide/symbols'
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
  // Editor groups model (VS Code "editor groups"). One state object drives every
  // open tab + split; pure reducers in ./ide/editor.js mutate it immutably.
  const [editor,         setEditor]         = useState(initialEditorState)
  const [activityActive, setActivityActive] = useState('explorer')
  const [bottomTab,      setBottomTab]      = useState('terminal')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [sheetOpen,      setSheetOpen]      = useState(false)
  const [zenMode,        setZenMode]        = useState(false)
  const [cursor,         setCursor]         = useState({ line: 1, col: 1 })

  // Derived back-compat values for the parts not (yet) group-aware.
  const activeTabObj  = activeTabOf(editor)
  const activeTab     = activeTabObj ? (activeTabObj.kind === 'file' ? 'file' : activeTabObj.kind) : 'readme'
  const openFile      = activeTabObj?.kind === 'file' ? activeTabObj.file : null

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
  const [secondaryVisible, setSecondaryVisible] = useState(false)
  const [secondaryWidth,   setSecondaryWidth]   = useState(300)

  const chat = useChat()

  const [settingsOpen, setSettingsOpen] = useState(false)

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteMode, setPaletteMode] = useState('files')
  const openPalette = useCallback((mode) => { setPaletteMode(mode); setPaletteOpen(true) }, [])

  const termIdRef    = useRef(2)
  const paneIdRef    = useRef(2)

  const terminalsRef        = useRef(terminals)
  const activeTerminalIdRef = useRef(activeTerminalId)
  const panelHeightRef      = useRef(panelHeight)
  const sidebarWidthRef     = useRef(sidebarWidth)
  const secondaryWidthRef   = useRef(secondaryWidth)
  useEffect(() => { terminalsRef.current        = terminals        }, [terminals])
  useEffect(() => { activeTerminalIdRef.current = activeTerminalId }, [activeTerminalId])
  useEffect(() => { panelHeightRef.current      = panelHeight      }, [panelHeight])
  useEffect(() => { sidebarWidthRef.current     = sidebarWidth     }, [sidebarWidth])
  useEffect(() => { secondaryWidthRef.current   = secondaryWidth   }, [secondaryWidth])

  // Hydrate persisted workbench layout once, after mount.
  useEffect(() => {
    let w
    try { w = JSON.parse(localStorage.getItem('ide-workbench') || '{}') } catch { return }
    if (typeof w.panelHeight === 'number')     setPanelHeight(w.panelHeight)
    if (typeof w.panelMaximized === 'boolean') setPanelMaximized(w.panelMaximized)
    if (typeof w.panelCollapsed === 'boolean') setPanelCollapsed(w.panelCollapsed)
    if (typeof w.sidebarWidth === 'number')    setSidebarWidth(w.sidebarWidth)
    if (typeof w.sidebarVisible === 'boolean') setSidebarVisible(w.sidebarVisible)
    if (typeof w.secondaryVisible === 'boolean') setSecondaryVisible(w.secondaryVisible)
    if (typeof w.secondaryWidth === 'number')    setSecondaryWidth(w.secondaryWidth)
    if (Array.isArray(w.terminals) && w.terminals.length) {
      const valid = w.terminals.filter(t => t && Array.isArray(t.panes) && t.panes.length)
      if (valid.length) {
        setTerminals(valid)
        termIdRef.current = Math.max(0, ...valid.map(t => t.id)) + 1
        paneIdRef.current = Math.max(0, ...valid.flatMap(t => t.panes)) + 1
        setActiveTerminalId(valid.some(t => t.id === w.activeTerminalId) ? w.activeTerminalId : valid.at(-1).id)
      }
    }
    if (w.editor) { const restored = deserializeEditor(w.editor); if (restored) setEditor(restored) }
  }, [])

  // Persist on change (skip the initial commit so we don't clobber storage).
  const firstWriteRef = useRef(true)
  useEffect(() => {
    if (firstWriteRef.current) { firstWriteRef.current = false; return }
    const data = { terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible, secondaryVisible, secondaryWidth, editor: serializeEditor(editor) }
    try { localStorage.setItem('ide-workbench', JSON.stringify(data)) } catch {}
  }, [terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible, secondaryVisible, secondaryWidth, editor])

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

  // Secondary side bar lives on the right; dragging its left edge leftward widens it.
  const startSecondaryResize = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = secondaryWidthRef.current
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (ev) => setSecondaryWidth(Math.min(Math.max(startW + (startX - ev.clientX), 220), 520))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

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
  const toggleWordWrap = useCallback(() => setSettings(p => ({ ...p, 'editor.wordWrap': (p['editor.wordWrap'] ?? 'off') === 'off' ? 'on' : 'off' })), [])

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

  // ── Editor group actions ──────────────────────────────────────────────────
  const openEditor = useCallback((spec, opts = {}) => {
    setEditor(e => openInGroup(e, spec, opts))
  }, [])
  // Files open as a reused *preview* tab by default; pass { preview:false } to pin
  // it open (double-click / drag-from-explorer behavior).
  const handleOpenFile = useCallback((filepath, line, opts = {}) => {
    openEditor({ kind: 'file', file: filepath, line }, { preview: opts.preview ?? true, groupId: opts.groupId })
  }, [openEditor])
  // The fixed README/memes/quotes/settings editors open as permanent tabs.
  const openKind = useCallback((kind, opts = {}) => {
    openEditor({ kind }, { preview: opts.preview ?? false, groupId: opts.groupId })
  }, [openEditor])

  const selectTab    = useCallback((groupId, tabId) => setEditor(e => setActiveTab(e, groupId, tabId)), [])
  const closeTabH    = useCallback((groupId, tabId) => setEditor(e => closeTab(e, groupId, tabId)), [])
  const closeOthersH = useCallback((groupId, tabId) => setEditor(e => closeOthers(e, groupId, tabId)), [])
  const closeAllH    = useCallback((groupId)        => setEditor(e => closeAll(e, groupId)), [])
  const pinH         = useCallback((groupId, tabId, pinned) => setEditor(e => setPinned(e, groupId, tabId, pinned)), [])
  const moveTabH     = useCallback((fromG, tabId, toG, idx) => setEditor(e => moveTab(e, fromG, tabId, toG, idx)), [])
  const splitTabOut  = useCallback((fromG, tabId, afterG)   => setEditor(e => moveTabToNewGroup(e, fromG, tabId, afterG)), [])
  const promoteTab   = useCallback((groupId, tabId) => setEditor(e => ({ ...e, groups: e.groups.map(g => g.id === groupId ? { ...g, tabs: g.tabs.map(t => t.id === tabId ? { ...t, preview: false } : t) } : g) })), [])
  const splitEditor  = useCallback(() => setEditor(e => splitGroup(e)), [])
  const focusGroupH  = useCallback((groupId) => setEditor(e => focusGroup(e, groupId)), [])

  // Tab drag-and-drop payload + right-click context menu state.
  const tabDragRef = useRef(null)                       // { groupId, tabId }
  const [tabDragging, setTabDragging] = useState(false)
  const [tabMenu, setTabMenu]         = useState(null)  // { groupId, tabId, x, y }
  const [tabListMenu, setTabListMenu] = useState(null)  // { groupId, x, y }

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

  // The memes feed shows full-res only once its editor has been viewed.
  useEffect(() => { if (activeTab === 'memes') setMemeTabViewed(true) }, [activeTab])

  // Per-tab breadcrumb label.
  const breadcrumbFor = (tab) => {
    if (!tab) return 'README.md'
    if (tab.kind === 'file') return tab.file
    return TABS.find(t => t.id === tab.kind)?.label || 'README.md'
  }

  const handleActivitySelect = (id) => {
    // Settings is a modal dialog, not a side-bar view — open it and leave the
    // current view/sidebar untouched (VS Code-style overlay).
    if (id === 'settings') { setSettingsOpen(true); return }
    // Clicking the already-active view toggles the side bar (VS Code behavior).
    if (id === activityActive) { setSidebarVisible(v => !v); return }
    if (id === 'git' && !commitsFetched) fetchCommits()
    setSidebarVisible(true)
    setActivityActive(id)
  }

  const handleCycleTab = useCallback(() => setEditor(e => cycleTab(e, 1)), [])

  const closeActiveEditor = useCallback(() => {
    setEditor(e => { const g = activeGroupOf(e); return g ? closeTab(e, g.id, g.activeTabId) : e })
  }, [])
  const closeActiveGroup = useCallback(() => setEditor(e => closeGroup(e, e.activeGroupId)), [])
  const focusGroupIdx    = useCallback((i) => setEditor(e => focusGroupByIndex(e, i)), [])
  const cycleTabH        = useCallback((d) => setEditor(e => cycleTab(e, d)), [])
  const mruSwitchH       = useCallback(()  => setEditor(e => mruSwitch(e)), [])
  const gotoLine         = useCallback((line) => { if (openFile) handleOpenFile(openFile, line, { preview: false }) }, [openFile, handleOpenFile])

  // Word wrap (editor.wordWrap is 'off' | 'on' | …) and detected indentation for
  // the open file, surfaced in the status bar like VS Code.
  const wordWrap = (settings['editor.wordWrap'] ?? 'off') !== 'off'
  const indent = useMemo(() => {
    const src = openFile ? fileContents?.[openFile] : null
    if (!src) return null
    for (const l of src.split('\n')) {
      if (l[0] === '\t') return 'Tab Size: ' + (settings['editor.tabSize'] ?? 2)
      const m = /^( +)\S/.exec(l)
      if (m) return 'Spaces: ' + m[1].length
    }
    return 'Spaces: ' + (settings['editor.tabSize'] ?? 2)
  }, [openFile, fileContents, settings])

  // ── Command Palette sources ───────────────────────────────────────────────
  const filePaths = useMemo(() => Object.keys(fileContents || {}), [fileContents])
  const paletteSymbols = useMemo(() => openFile ? parseSymbols(openFile, fileContents?.[openFile] || '') : [], [openFile, fileContents])
  const paletteCommands = useMemo(() => [
    { id: 'term-new',     label: 'Terminal: Create New Terminal', hint: 'Ctrl+Shift+`', run: addTerminal },
    { id: 'term-split',   label: 'Terminal: Split Terminal',                            run: splitTerminal },
    { id: 'split-editor', label: 'View: Split Editor',            hint: 'Ctrl+\\',      run: splitEditor },
    { id: 'close-group',  label: 'View: Close Editor Group',       hint: 'Ctrl+K W',     run: closeActiveGroup },
    { id: 'goto-symbol',  label: 'Go to Symbol in Editor…',        hint: 'Ctrl+Shift+O', run: () => openPalette('symbols') },
    { id: 'goto-line',    label: 'Go to Line/Column…',             hint: 'Ctrl+G',       run: () => openPalette('goto') },
    { id: 'view-panel',   label: 'View: Toggle Panel',            hint: 'Ctrl+`',       run: () => setPanelCollapsed(c => !c) },
    { id: 'view-sidebar', label: 'View: Toggle Primary Side Bar', hint: 'Ctrl+B',       run: () => setSidebarVisible(v => !v) },
    { id: 'view-maxpanel',label: 'View: Toggle Maximized Panel',                        run: () => { setPanelMaximized(m => !m); setPanelCollapsed(false) } },
    { id: 'view-zen',     label: 'View: Toggle Zen Mode',         hint: 'Ctrl+K Z',     run: () => setZenMode(z => !z) },
    { id: 'view-wrap',    label: 'View: Toggle Word Wrap',        hint: 'Alt+Z',        run: toggleWordWrap },
    { id: 'view-secondary', label: 'View: Toggle Secondary Side Bar (Chat)', hint: 'Ctrl+Alt+B', run: () => setSecondaryVisible(v => !v) },
    { id: 'pref-settings',label: 'Preferences: Open Settings',         hint: 'Ctrl+,',     run: () => setSettingsOpen(true) },
    { id: 'go-readme',    label: 'Go to File: README.md',                               run: () => openKind('readme') },
    { id: 'go-memes',     label: 'Go to File: memes.feed',                              run: () => openKind('memes') },
    { id: 'go-quotes',    label: 'Go to File: quotes.log',                              run: () => openKind('quotes') },
    ...Object.keys(THEMES).map(name => ({ id: `theme-${name}`, label: `Preferences: Color Theme — ${name}`, run: () => setSetting('workbench.colorTheme', name) })),
    { id: 'net-log',      label: 'Network: Toggle Request Log',                         run: () => setSetting('network.showLog', !settings['network.showLog']) },
  ], [addTerminal, splitTerminal, splitEditor, closeActiveGroup, openPalette, openKind, setSetting, settings, toggleWordWrap])

  // ── Global keybindings (VS Code-style, incl. Ctrl+K chords) ───────────────
  const chordRef   = useRef(0)  // timestamp of a pending Ctrl+K
  const lastEscRef = useRef(0)  // for double-Esc to exit Zen
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key

      // Esc closes the Settings dialog first.
      if (k === 'Escape' && settingsOpen) { setSettingsOpen(false); return }

      // Double-Esc exits Zen mode.
      if (k === 'Escape') {
        if (zenMode) {
          const now = Date.now()
          if (now - lastEscRef.current < 500) { setZenMode(false); lastEscRef.current = 0 }
          else lastEscRef.current = now
        }
        return
      }

      // Second key of a Ctrl+K chord.
      if (chordRef.current && Date.now() - chordRef.current < 1500) {
        chordRef.current = 0
        if (k === 'z') { e.preventDefault(); setZenMode(z => !z); return }
        if (k === 'w') { e.preventDefault(); closeActiveGroup(); return }
      }

      // Alt+Z toggles word wrap (no Ctrl).
      if (k === 'z' && e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleWordWrap(); return }

      if (!(e.ctrlKey || e.metaKey)) return

      if (k === 'k')              { e.preventDefault(); chordRef.current = Date.now(); return }
      if (k === 'b' && e.altKey)  { e.preventDefault(); setSecondaryVisible(v => !v); return }

      switch (k) {
        case ',':        e.preventDefault(); setSettingsOpen(true); break
        case 'p':        e.preventDefault(); openPalette(e.shiftKey ? 'commands' : 'files'); break
        case 'g':        e.preventDefault(); openPalette('goto'); break
        case 'o':        if (e.shiftKey) { e.preventDefault(); openPalette('symbols') } break
        case '`':        e.preventDefault(); setPanelCollapsed(c => !c); setBottomTab('terminal'); break
        case '~':        e.preventDefault(); addTerminal(); break // Ctrl+Shift+`
        case 'j':        e.preventDefault(); setPanelCollapsed(c => !c); break
        case 'b':        e.preventDefault(); setSidebarVisible(v => !v); break
        case '\\':       e.preventDefault(); splitEditor(); break
        case 'w':        e.preventDefault(); closeActiveEditor(); break
        case 'Tab':      e.preventDefault(); mruSwitchH(); break
        case 'PageUp':   e.preventDefault(); cycleTabH(-1); break
        case 'PageDown': e.preventDefault(); cycleTabH(1); break
        case '1':        e.preventDefault(); focusGroupIdx(0); break
        case '2':        e.preventDefault(); focusGroupIdx(1); break
        case '3':        e.preventDefault(); focusGroupIdx(2); break
        default: break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPalette, addTerminal, splitEditor, closeActiveEditor, closeActiveGroup, focusGroupIdx, cycleTabH, mruSwitchH, toggleWordWrap, zenMode, settingsOpen])

  // ── Per-tab presentation + content ────────────────────────────────────────
  const tabMeta = (tab) => {
    if (tab.kind === 'file')     return { label: tab.file.split('/').pop(), color: getFileColor(tab.file) }
    const t = TABS.find(x => x.id === tab.kind)
    return { label: t?.label || tab.kind, color: t?.color }
  }

  const renderTabContent = (tab, active) => {
    switch (tab.kind) {
      case 'readme':   return readmeContent ?? <ReadmeEditor repos={repos} stack={stack} />
      case 'memes':    return (
        <MemesEditor
          memeUrl={memeUrl} memeLoading={memeLoading} onNext={fetchMeme}
          autoPlay={settings['memes.autoPlay']}
          interval={settings['memes.interval']}
          onAutoPlayChange={v => setSetting('memes.autoPlay', v)}
          onIntervalChange={v => setSetting('memes.interval', v)}
        />
      )
      case 'quotes':   return <QuotesEditor quote={quote} loading={quoteLoading} onNext={fetchQuote} />
      case 'file':     return (
        <CodeViewer
          filename={tab.file}
          content={fileContents?.[tab.file] || `// could not read ${tab.file}`}
          scrollToLine={tab.line}
          minimap={settings['editor.minimap']}
          stickyScroll={settings['editor.stickyScroll']}
          indentGuides={settings['editor.guides.indentation']}
          wordWrap={wordWrap}
          active={active}
          onCursor={(line, col) => setCursor({ line, col })}
        />
      )
      default: return null
    }
  }

  return (
    <div className={`ide-root${zenMode ? ' zen' : ''}`} ref={ideRootRef}>
      <MobileHeader
        activeTab={activeTab}
        openFile={openFile}
        onDrawer={() => setDrawerOpen(true)}
        onSheet={() => setSheetOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        openFile={openFile}
        onTabChange={id => openKind(id)}
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
        <ActivityBar
          active={activityActive}
          onSelect={handleActivitySelect}
          secondaryActive={secondaryVisible}
          onToggleSecondary={() => setSecondaryVisible(v => !v)}
        />
        {sidebarVisible && (
          <div className="ide-sidebar-host" style={{ width: sidebarWidth }}>
            <Sidebar
              activityView={activityActive}
              activeTab={activeTab}
              openFile={openFile}
              onTabChange={id => openKind(id)}
              onOpenFile={handleOpenFile}
              repos={repos}
              fileTree={fileTree}
              stack={stack}
              commits={commits}
              commitsLoading={commitsLoading}
              fileContents={fileContents}
              editorGroups={editor.groups}
              activeGroupId={editor.activeGroupId}
              onSelectTab={selectTab}
              onCloseTab={closeTabH}
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
        <div className="ide-editor-groups">
          {editor.groups.map(group => {
            const gFocused = group.id === editor.activeGroupId
            const aTab = group.tabs.find(t => t.id === group.activeTabId) || group.tabs[0]
            return (
              <div
                key={group.id}
                className={`ide-editor-group${gFocused ? ' focused' : ''}`}
                onMouseDown={() => { if (!gFocused) focusGroupH(group.id) }}
              >
                <div
                  className="ide-tab-bar"
                  onDragOver={e => { if (tabDragRef.current) e.preventDefault() }}
                  onDrop={e => { const d = tabDragRef.current; if (d) { e.preventDefault(); moveTabH(d.groupId, d.tabId, group.id, group.tabs.length) } }}
                >
                  {group.tabs.map(tab => {
                    const m = tabMeta(tab)
                    const active = tab.id === group.activeTabId
                    const dirty  = tab.kind === 'memes' || tab.kind === 'quotes'
                    return (
                      <div
                        key={tab.id}
                        className={`ide-tab${active ? ' active' : ''}${tab.preview ? ' preview' : ''}${tab.pinned ? ' pinned' : ''}${dirty ? ' dirty' : ''}`}
                        draggable
                        onDragStart={e => { tabDragRef.current = { groupId: group.id, tabId: tab.id }; setTabDragging(true); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => { tabDragRef.current = null; setTabDragging(false) }}
                        onDragOver={e => { if (tabDragRef.current) e.preventDefault() }}
                        onDrop={e => { const d = tabDragRef.current; if (d) { e.preventDefault(); e.stopPropagation(); moveTabH(d.groupId, d.tabId, group.id, group.tabs.findIndex(t => t.id === tab.id)) } }}
                        onClick={() => selectTab(group.id, tab.id)}
                        onDoubleClick={() => promoteTab(group.id, tab.id)}
                        onAuxClick={e => { if (e.button === 1) { e.preventDefault(); closeTabH(group.id, tab.id) } }}
                        onContextMenu={e => { e.preventDefault(); selectTab(group.id, tab.id); setTabMenu({ groupId: group.id, tabId: tab.id, x: e.clientX, y: e.clientY }) }}
                        onMouseEnter={() => { if (tab.kind === 'memes' && memeUrl) { const img = new window.Image(); img.src = memeUrl } }}
                        title={tab.kind === 'file' ? tab.file : m.label}
                      >
                        <span className="ide-tab-dot" style={{ background: m.color }} />
                        <span className="ide-tab-label">{m.label}</span>
                        <span
                          className="ide-tab-close"
                          title={tab.pinned ? 'Unpin' : 'Close'}
                          onClick={e => { e.stopPropagation(); tab.pinned ? pinH(group.id, tab.id, false) : closeTabH(group.id, tab.id) }}
                        />
                      </div>
                    )
                  })}
                  <div className="ide-tab-bar-spacer" />
                  {group.tabs.length > 1 && (
                    <button
                      className="ide-tab-overflow"
                      title="Open editors…"
                      aria-label="Open editors"
                      onClick={e => { e.stopPropagation(); setTabListMenu({ groupId: group.id, x: e.clientX, y: e.clientY }) }}
                    >⌄</button>
                  )}
                </div>

                <Breadcrumb
                  tab={aTab}
                  fileTree={fileTree}
                  fileContents={fileContents}
                  onOpenFile={handleOpenFile}
                  fixedLabel={breadcrumbFor(aTab)}
                />

                {aTab && renderTabContent(aTab, gFocused)}

                {/* Drop a dragged tab here to split it into a new group. */}
                <div
                  className="ide-group-dropzone"
                  style={{ pointerEvents: tabDragging ? 'auto' : 'none' }}
                  onDragOver={e => { if (tabDragRef.current) { e.preventDefault(); e.currentTarget.classList.add('over') } }}
                  onDragLeave={e => e.currentTarget.classList.remove('over')}
                  onDrop={e => { const d = tabDragRef.current; e.currentTarget.classList.remove('over'); if (d) { e.preventDefault(); splitTabOut(d.groupId, d.tabId, group.id) } }}
                />
              </div>
            )
          })}
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
                themeVars={THEMES[settings['workbench.colorTheme']] || THEMES['Catppuccin Mocha']}
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

        {secondaryVisible && (
          <SecondaryBar
            chat={chat}
            onClose={() => setSecondaryVisible(false)}
          />
        )}
      </div>

      <MobileNav activeTab={activeTab} onTabChange={id => openKind(id)} />

      <StatusBar
        tab={activeTab}
        openFile={openFile}
        repos={repos}
        clock={clock}
        cursor={cursor}
        indent={indent}
        onOpenGit={() => { setActivityActive('git'); if (!commitsFetched) fetchCommits() }}
        onOpenExplorer={() => setActivityActive('explorer')}
        setPanelTab={() => {}}
        onCycleTab={handleCycleTab}
      />

      {settingsOpen && (
        <div className="ide-settings-modal-overlay" onMouseDown={() => setSettingsOpen(false)}>
          <div
            className="ide-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="ide-settings-modal-header">
              <span className="ide-settings-modal-title">Settings</span>
              <button
                className="ide-settings-modal-close"
                title="Close (Esc)"
                aria-label="Close Settings"
                onClick={() => setSettingsOpen(false)}
              >×</button>
            </div>
            <div className="ide-settings-modal-body">
              <SettingsUI settings={settings} setSetting={setSetting} />
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        initialMode={paletteMode}
        files={filePaths}
        commands={paletteCommands}
        symbols={paletteSymbols}
        onOpenFile={handleOpenFile}
        onGotoLine={gotoLine}
        onClose={() => setPaletteOpen(false)}
      />

      {tabMenu && (() => {
        const grp = editor.groups.find(g => g.id === tabMenu.groupId)
        const tab = grp?.tabs.find(t => t.id === tabMenu.tabId)
        if (!tab) return null
        const isFile = tab.kind === 'file'
        return (
          <ContextMenu
            x={tabMenu.x} y={tabMenu.y}
            onClose={() => setTabMenu(null)}
            items={[
              { label: 'Close', hint: 'Ctrl+W', onClick: () => closeTabH(tabMenu.groupId, tabMenu.tabId) },
              { label: 'Close Others', disabled: grp.tabs.length <= 1, onClick: () => closeOthersH(tabMenu.groupId, tabMenu.tabId) },
              { label: 'Close All', onClick: () => closeAllH(tabMenu.groupId) },
              { sep: true },
              { label: tab.pinned ? 'Unpin' : 'Pin', onClick: () => pinH(tabMenu.groupId, tabMenu.tabId, !tab.pinned) },
              { label: 'Split Editor', hint: 'Ctrl+\\', onClick: () => splitTabOut(tabMenu.groupId, tabMenu.tabId, tabMenu.groupId) },
              ...(isFile ? [
                { sep: true },
                { label: 'Copy Path', onClick: () => { try { navigator.clipboard?.writeText(tab.file) } catch {} } },
                { label: 'Reveal in Explorer', onClick: () => { setActivityActive('explorer'); setSidebarVisible(true) } },
              ] : []),
            ]}
          />
        )
      })()}

      {tabListMenu && (() => {
        const grp = editor.groups.find(g => g.id === tabListMenu.groupId)
        if (!grp) return null
        return (
          <ContextMenu
            x={tabListMenu.x} y={tabListMenu.y}
            onClose={() => setTabListMenu(null)}
            items={grp.tabs.map(t => ({
              label: tabMeta(t).label,
              onClick: () => selectTab(grp.id, t.id),
            }))}
          />
        )
      })()}
    </div>
  )
}
