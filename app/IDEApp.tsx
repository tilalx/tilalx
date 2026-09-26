'use client'

import { useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { computeProblems } from './ide/utils'
import {
  initialEditorState, activeGroupOf, activeTabOf, openInGroup, closeTab, closeGroup, setActiveTab,
  focusGroupByIndex, splitGroup, cycleTab, mruSwitch,
} from './ide/editor'
import { useChat } from './ide/useChat'
import { useWorkbenchLayout } from './ide/useWorkbenchLayout'
import { useSettings } from './ide/useSettings'
import { useFeeds } from './ide/useFeeds'
import { useEditorHistory } from './ide/useEditorHistory'
import { useKeybindings } from './ide/useKeybindings'
import { paletteCommands, titleMenus } from './ide/commands'
import type { WorkbenchActions } from './ide/commands'
import { parseSymbols } from './ide/symbols'
import { MobileHeader, MobileNav, Drawer } from './ide/Mobile'
import EditorGroups, { TabContextMenu, TabListMenu } from './ide/EditorGroups'
import type { TabMenuState, TabListMenuState } from './ide/EditorGroups'
import BottomPanel from './ide/BottomPanel'
import SecondaryBar from './ide/SecondaryBar'
import TitleBar from './ide/TitleBar'
import HoverTooltips from './ide/HoverTooltips'
import ActivityBar from './ide/ActivityBar'
import Sidebar from './ide/Sidebar'
import MemesEditor from './ide/MemesEditor'
import QuotesEditor from './ide/QuotesEditor'
import SettingsUI from './ide/SettingsUI'
import CodeViewer from './ide/CodeViewer'
import LivePreview from './ide/LivePreview'
import TerminalView from './ide/XTermPanel'
import StatusBar from './ide/StatusBar'
import PreviewSheet from './ide/PreviewSheet'
import CommandPalette from './ide/CommandPalette'
import type { PaletteMode } from './ide/CommandPalette'
import type { Commit, FileNode, Meme, Quote, Repo, StackItem, Tab, TabKind, TabSpec } from './ide/types'

interface IDEAppProps {
  initialQuotes?: Quote[]
  initialMemes?: Meme[]
  initialCommits?: Commit[]
  repos: Repo[]
  stack: StackItem[]
  fileTree?: FileNode[]
  fileContents: Record<string, string>
  readmeContent: ReactNode
}

type OpenOpts = { preview?: boolean; groupId?: string }

export default function IDEApp({ initialQuotes = [], initialMemes = [], initialCommits = [], repos, stack, fileTree = [], fileContents, readmeContent }: IDEAppProps) {
  const [editor,         setEditor]         = useState(initialEditorState)
  const [activityActive, setActivityActive] = useState<string>('explorer')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [sheetOpen,      setSheetOpen]      = useState(false)
  const [zenMode,        setZenMode]        = useState(false)
  const [settingsOpen,   setSettingsOpen]   = useState(false)
  const [cursor,         setCursor]         = useState({ line: 1, col: 1 })
  const [palette,        setPalette]        = useState<{ open: boolean; mode: PaletteMode }>({ open: false, mode: 'files' })
  const [tabMenu,        setTabMenu]        = useState<TabMenuState | null>(null)
  const [tabListMenu,    setTabListMenu]    = useState<TabListMenuState | null>(null)

  const activeTabObj = activeTabOf(editor)
  const activeTab: TabKind = activeTabObj ? activeTabObj.kind : 'readme'
  const openFile = activeTabObj?.kind === 'file' ? activeTabObj.file ?? null : null

  const layout = useWorkbenchLayout(editor, setEditor)
  const { settings, setSetting, toggleWordWrap, fontSize, themeVars } = useSettings()
  const feeds = useFeeds({ initialMemes, initialQuotes, initialCommits, activeTab })
  const { navigate, canGoBack, canGoForward } = useEditorHistory(activeTabObj, setEditor)

  const openFileTab = useCallback((filepath: string, line?: number | null, opts: OpenOpts = {}) => {
    const spec: TabSpec = { kind: 'file', file: filepath, line: line ?? undefined }
    setEditor(e => openInGroup(e, spec, { preview: opts.preview ?? true, groupId: opts.groupId }))
  }, [])
  const openFromTool = useCallback((path: string, line?: number) => openFileTab(path, line, { preview: false }), [openFileTab])
  const openKind = (kind: TabKind) => setEditor(e => openInGroup(e, { kind }, { preview: false }))

  const chat = useChat({ files: fileContents, openFile, onOpenFile: openFromTool })

  const showView = (id: string) => { setActivityActive(id); layout.setSidebarVisible(true) }

  const actions: WorkbenchActions = {
    openPalette:          mode => setPalette({ open: true, mode }),
    showView,
    navigate,
    openKind,
    openSettings:         () => setSettingsOpen(true),
    closeSettings:        () => setSettingsOpen(false),
    splitEditor:          () => setEditor(e => splitGroup(e)),
    closeActiveEditor:    () => setEditor(e => { const g = activeGroupOf(e); return g ? closeTab(e, g.id, g.activeTabId) : e }),
    closeActiveGroup:     () => setEditor(e => closeGroup(e, e.activeGroupId)),
    focusGroup:           i => setEditor(e => focusGroupByIndex(e, i)),
    cycleTab:             d => setEditor(e => cycleTab(e, d)),
    mruSwitch:            () => setEditor(e => mruSwitch(e)),
    addTerminal:          layout.addTerminal,
    splitTerminal:        layout.splitTerminal,
    toggleSidebar:        () => layout.setSidebarVisible(v => !v),
    toggleSecondary:      () => layout.setSecondaryVisible(v => !v),
    togglePanel:          () => layout.setPanelCollapsed(c => !c),
    toggleTerminalPanel:  () => { layout.setPanelCollapsed(c => !c); layout.setBottomTab('terminal') },
    toggleMaximizedPanel: layout.toggleMaximizedPanel,
    toggleZen:            () => setZenMode(z => !z),
    exitZen:              () => setZenMode(false),
    toggleWordWrap,
    toggleNetworkLog:     () => setSetting('network.showLog', !settings['network.showLog']),
    setTheme:             name => setSetting('workbench.colorTheme', name),
  }
  useKeybindings(actions, settingsOpen, zenMode)

  const handleActivitySelect = (id: string) => {
    if (id === 'settings') { setSettingsOpen(true); return }
    if (id === activityActive) { layout.setSidebarVisible(v => !v); return }
    if (id === 'git') feeds.fetchCommits()
    showView(id)
  }

  const gotoLine = (line: number) => { if (openFile) openFileTab(openFile, line, { preview: false }) }

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

  const problems = useMemo(() => computeProblems(repos), [repos])
  const filePaths = useMemo(() => Object.keys(fileContents || {}), [fileContents])
  const symbols = useMemo(() => openFile ? parseSymbols(openFile, fileContents?.[openFile] || '') : [], [openFile, fileContents])

  const renderTabContent = (tab: Tab, active: boolean) => {
    switch (tab.kind) {
      case 'readme':   return readmeContent
      case 'memes':    return (
        <MemesEditor
          memeUrl={feeds.memeUrl} memeLoading={feeds.memeLoading} onNext={feeds.fetchMeme}
          autoPlay={!!settings['memes.autoPlay']}
          interval={Number(settings['memes.interval'] ?? 10)}
          onAutoPlayChange={v => setSetting('memes.autoPlay', v)}
          onIntervalChange={v => setSetting('memes.interval', v)}
        />
      )
      case 'quotes':   return <QuotesEditor quote={feeds.quote} loading={feeds.quoteLoading} onNext={feeds.fetchQuote} />
      case 'file':     return (
        <CodeViewer
          filename={tab.file}
          content={fileContents?.[tab.file!] || `// could not read ${tab.file}`}
          scrollToLine={tab.line}
          minimap={!!settings['editor.minimap']}
          stickyScroll={!!settings['editor.stickyScroll']}
          indentGuides={!!settings['editor.guides.indentation']}
          wordWrap={wordWrap}
          active={active}
          onCursor={(line, col) => setCursor({ line, col })}
        />
      )
      default: return null
    }
  }

  return (
    <div className={`ide-root${zenMode ? ' zen' : ''}`}>
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
        onTabChange={openKind}
        onOpenFile={openFileTab}
        repos={repos}
        fileTree={fileTree}
      />
      <PreviewSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        memeUrl={feeds.previewMemeUrl} memeLoading={feeds.memeLoading}
        quote={feeds.quote} quoteLoading={feeds.quoteLoading}
        networkLog={feeds.networkLog}
        showLog={!!settings['network.showLog']}
      />

      <TitleBar
        title="tilalx"
        menus={titleMenus(actions, canGoBack, canGoForward)}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        sidebarVisible={layout.sidebarVisible}
        panelVisible={!layout.panelCollapsed}
        secondaryVisible={layout.secondaryVisible}
        onCommandCenter={() => actions.openPalette('files')}
        onBack={() => navigate(-1)}
        onForward={() => navigate(1)}
        onToggleSidebar={actions.toggleSidebar}
        onTogglePanel={actions.togglePanel}
        onToggleSecondary={actions.toggleSecondary}
      />

      <div className="ide-main">
        <ActivityBar
          active={activityActive}
          onSelect={handleActivitySelect}
          secondaryActive={layout.secondaryVisible}
          onToggleSecondary={actions.toggleSecondary}
        />
        {layout.sidebarVisible && (
          <div className="ide-sidebar-host" style={{ width: layout.sidebarWidth }}>
            <Sidebar
              activityView={activityActive}
              activeTab={activeTab}
              openFile={openFile}
              onTabChange={openKind}
              onOpenFile={openFileTab}
              repos={repos}
              fileTree={fileTree}
              stack={stack}
              commits={feeds.commits}
              commitsLoading={feeds.commitsLoading}
              fileContents={fileContents}
              editorGroups={editor.groups}
              activeGroupId={editor.activeGroupId}
              onSelectTab={(groupId, tabId) => setEditor(e => setActiveTab(e, groupId, tabId))}
              onCloseTab={(groupId, tabId) => setEditor(e => closeTab(e, groupId, tabId))}
            />
            <div
              className="ide-sidebar-resize-handle"
              onPointerDown={layout.startSidebarResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize side bar"
            />
          </div>
        )}

        <div className="ide-editor-center">
          <EditorGroups
            editor={editor}
            setEditor={setEditor}
            fileTree={fileTree}
            fileContents={fileContents}
            memeUrl={feeds.memeUrl}
            onOpenFile={openFileTab}
            renderContent={renderTabContent}
            onTabMenu={setTabMenu}
            onTabListMenu={setTabListMenu}
          />

          <BottomPanel layout={layout} repos={repos}>
            <TerminalView
              groups={layout.terminals}
              activeId={layout.activeTerminalId}
              isActive={!layout.panelCollapsed && layout.bottomTab === 'terminal'}
              onAdd={layout.addTerminal}
              onSelect={layout.setActiveTerminalId}
              onClose={layout.closeTerminal}
              onClosePane={layout.closePane}
              onRename={layout.renameTerminal}
              repos={repos} stack={stack} commits={feeds.commits} fileTree={fileTree}
              files={fileContents} onOpenFile={openFromTool} chat={chat}
              themeVars={themeVars}
              fontSize={fontSize}
            />
          </BottomPanel>
        </div>

        <div className="ide-right-panel">
          <div className="ide-panel-tabs">
            <div className="ide-panel-tab active">Live Preview</div>
          </div>
          <LivePreview
            memeUrl={feeds.previewMemeUrl} memeLoading={feeds.memeLoading}
            quote={feeds.quote} quoteLoading={feeds.quoteLoading}
            networkLog={feeds.networkLog} showLog={!!settings['network.showLog']}
          />
        </div>

        {layout.secondaryVisible && (
          <SecondaryBar
            chat={chat}
            onClose={() => layout.setSecondaryVisible(false)}
          />
        )}
      </div>

      <MobileNav activeTab={activeTab} onTabChange={openKind} />

      <StatusBar
        tab={activeTab}
        openFile={openFile}
        problems={problems}
        cursor={cursor}
        indent={indent}
        onOpenGit={() => { showView('git'); feeds.fetchCommits() }}
        onOpenProblems={() => { layout.setBottomTab('problems'); layout.setPanelCollapsed(false) }}
        onGotoLine={() => actions.openPalette('goto')}
        onCycleTab={() => actions.cycleTab(1)}
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
        open={palette.open}
        initialMode={palette.mode}
        files={filePaths}
        commands={paletteCommands(actions)}
        symbols={symbols}
        onOpenFile={openFileTab}
        onGotoLine={gotoLine}
        onClose={() => setPalette(p => ({ ...p, open: false }))}
      />

      {tabMenu && (
        <TabContextMenu
          menu={tabMenu}
          editor={editor}
          setEditor={setEditor}
          onReveal={() => showView('explorer')}
          onClose={() => setTabMenu(null)}
        />
      )}

      <HoverTooltips />

      {tabListMenu && (
        <TabListMenu
          menu={tabListMenu}
          editor={editor}
          setEditor={setEditor}
          onClose={() => setTabListMenu(null)}
        />
      )}
    </div>
  )
}
