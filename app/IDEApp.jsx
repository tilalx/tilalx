'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { ProblemsPanel, TerminalPanel } from './ide/Terminal'
import StatusBar from './ide/StatusBar'
import PreviewSheet from './ide/PreviewSheet'


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

function Drawer({ open, onClose, activeTab, openFile, onTabChange, onOpenFile, repos }) {
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

export default function IDEApp({ initialQuotes = [], initialMemes = [], initialCommits = [], repos, stack, fileContents, readmeContent }) {
  const [activeTab,      setActiveTab]      = useState('readme')
  const [activityActive, setActivityActive] = useState('explorer')
  const [panelTab,       setPanelTab]       = useState('preview')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [sheetOpen,      setSheetOpen]      = useState(false)

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

  const [settings, setSettings] = useState(() => {
    const defaults = { 'memes.autoPlay': false, 'memes.interval': 10, 'editor.fontSize': 13, 'network.showLog': true }
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('ide-settings') || '{}') } } catch { return defaults }
  })
  const setSetting = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), [])

  useEffect(() => {
    const str = JSON.stringify(settings)
    try { localStorage.setItem('ide-settings', str) } catch {}
    document.cookie = `ide-settings=${encodeURIComponent(str)}; path=/; max-age=31536000; SameSite=Lax`
  }, [settings])

  const [commits,        setCommits]        = useState(initialCommits)
  const [commitsLoading, setCommitsLoading] = useState(false)
  const [commitsFetched, setCommitsFetched] = useState(initialCommits.length > 0)

  const [termHistory, setTermHistory] = useState([
    { type: 'output', text: 'tilalx terminal v1.0.0' },
    { type: 'output', text: 'Type "help" for available commands.' },
  ])
  const [termInput, setTermInput] = useState('')
  const termInputRef = useRef(null)

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

  const handleTermSubmit = useCallback(() => {
    if (!termInput.trim()) return
    const result = runTerminalCommand(termInput, { repos, stack, commits })
    if (result === null) {
      setTermHistory([])
    } else {
      setTermHistory(prev => [
        ...prev,
        { type: 'prompt', text: termInput },
        ...result.map(text => ({ type: 'output', text })),
      ])
    }
    setTermInput('')
  }, [termInput, repos, stack, commits])

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
    if (id === 'git' && !commitsFetched) fetchCommits()
    if (id === 'settings') setActiveTab('settings')
    setActivityActive(id)
  }

  const handleCycleTab = () => {
    const ids = TABS.map(t => t.id)
    const idx = ids.indexOf(activeTab)
    setActiveTab(ids[(idx + 1) % ids.length])
    setOpenFile(null)
  }

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
        <Sidebar
          activityView={activityActive}
          activeTab={activeTab}
          openFile={openFile}
          onTabChange={id => { setActiveTab(id); setOpenFile(null) }}
          onOpenFile={handleOpenFile}
          repos={repos}
          stack={stack}
          commits={commits}
          commitsLoading={commitsLoading}
          settings={settings}
          fileContents={fileContents}
        />

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

        <div className="ide-right-panel">
          <div className="ide-panel-tabs">
            {[
              { id: 'preview',  label: 'Live Preview' },
              { id: 'problems', label: 'Problems'     },
              { id: 'terminal', label: 'Terminal'     },
            ].map(pt => (
              <div
                key={pt.id}
                className={`ide-panel-tab${panelTab === pt.id ? ' active' : ''}`}
                onClick={() => setPanelTab(pt.id)}
              >
                {pt.label}
              </div>
            ))}
          </div>
          {panelTab === 'preview'  && (
            <LivePreview
              memeUrl={memeTabViewed ? memeUrl : memeThumbUrl} memeLoading={memeLoading}
              quote={quote} quoteLoading={quoteLoading}
              networkLog={networkLog} showLog={settings['network.showLog']}
            />
          )}
          {panelTab === 'problems' && <ProblemsPanel repos={repos} />}
          {panelTab === 'terminal' && (
            <TerminalPanel
              history={termHistory} input={termInput}
              onInput={setTermInput} onSubmit={handleTermSubmit}
              inputRef={termInputRef}
            />
          )}
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
        setPanelTab={setPanelTab}
        onCycleTab={handleCycleTab}
      />
    </div>
  )
}
