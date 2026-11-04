'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { WorkbenchContext, editorRequestsHandled, useIsMac } from './context'
import { Codicon } from './icons'
import type { Cursor, PanelId, QuickMode, ViewId, Workbench as WorkbenchApi } from './context'
import { COMMANDS, findCommand } from './commands'
import { matchesKey } from './keybinding'
import { THEMES, themeCssVars } from './theme'
import type { ThemeId } from './theme'
import { SETTINGS_COOKIE } from './settings'
import type { Settings } from './settings'
import { README_PATH } from './paths'
import { activeTabOf, closeOthers, closeTabs, closeToRight, findTab, initialEditors, openEditor, pinTab, splitGroup } from './editors/model'
import type { EditorsState, OpenOptions } from './editors/model'
import type { EditorInput, WorkbenchData } from './types'
import TitleBar from './parts/TitleBar'
import ActivityBar from './parts/ActivityBar'
import StatusBar from './parts/StatusBar'
import Sidebar from './parts/Sidebar'
import Panel from './parts/Panel'
import QuickInput from './parts/QuickInput'
import ContextMenu from './parts/ContextMenu'
import type { MenuItem, MenuRequest } from './parts/ContextMenu'
import Notifications from './parts/Notifications'
import type { Notification } from './parts/Notifications'
import EditorPart from './editors/EditorPart'
import type { TabMenuRequest } from './editors/EditorPart'
import Sash from './parts/Sash'

const SIDEBAR_DEFAULT = 300
const PANEL_DEFAULT   = 300

/** Phones get a deliberately different layout (see the narrow media query in workbench.css). */
const NARROW_QUERY = '(max-width: 700px)'
const isNarrow = () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches

function startupEditors(setting: Settings['workbench.startupEditor']): EditorsState {
  if (setting === 'none')   return initialEditors([])
  if (setting === 'readme') return initialEditors([{ type: 'preview', path: README_PATH }])
  return initialEditors([{ type: 'welcome' }, { type: 'preview', path: README_PATH }])
}

export default function Workbench({ data, initialSettings }: { data: WorkbenchData; initialSettings: Settings }) {
  const mac = useIsMac()
  const [settings, setSettings] = useState(initialSettings)
  const [editors, setEditorsState] = useState(() => startupEditors(initialSettings['workbench.startupEditor']))
  const [files, setFiles]     = useState<Record<string, string>>(data.files)
  const [saved, setSaved]     = useState<Record<string, string>>(data.files)
  const [sidebar, setSidebar] = useState<{ visible: boolean; view: ViewId; width: number }>({ visible: true, view: 'explorer', width: SIDEBAR_DEFAULT })
  const [panel, setPanel]     = useState<{ visible: boolean; view: PanelId; height: number; maximized: boolean }>({ visible: false, view: 'terminal', height: PANEL_DEFAULT, maximized: false })
  const [quick, setQuick]     = useState<{ mode: QuickMode; value: string } | null>(null)
  const [menu, setMenu]       = useState<MenuRequest | null>(null)
  const [notes, setNotes]     = useState<Notification[]>([])
  const [cursor, setCursor]   = useState<Cursor>({ line: 1, column: 1, selected: 0 })
  const [zen, setZen]         = useState(false)
  const [revealLine, setRevealLine] = useState<WorkbenchApi['revealLine']>(null)
  const [editorFocus, setEditorFocus] = useState(0)
  const history = useRef<{ stack: string[]; index: number }>({ stack: [], index: -1 })
  const [, bumpHistory] = useState(0)
  const loading = useRef(new Set<string>())
  const chord = useRef<{ first: string; at: number } | null>(null)

  const theme = THEMES[settings['workbench.colorTheme']]

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      document.cookie = `${SETTINGS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }, [])

  // Theme variables live on <html> so the server-rendered colours match before hydration.
  useEffect(() => {
    const root = document.documentElement
    for (const [k, v] of Object.entries(themeCssVars(theme))) root.style.setProperty(k, v)
    root.style.colorScheme = theme.type
    root.dataset.theme = theme.type
  }, [theme])

  const setEditors = useCallback((fn: (s: EditorsState) => EditorsState) => setEditorsState(fn), [])

  const notify = useCallback((message: string, severity: Notification['severity'] = 'info') => {
    const id = Date.now() + Math.random()
    setNotes(n => [...n, { id, message, severity }])
    setTimeout(() => setNotes(n => n.filter(x => x.id !== id)), 10_000)
  }, [])

  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const loadFile = useCallback((path: string) => {
    if (loading.current.has(path)) return
    loading.current.add(path)
    setFailed(f => f.has(path) ? new Set([...f].filter(p => p !== path)) : f)
    fetch(`/api/file?path=${encodeURIComponent(path)}`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(String(r.status))))
      .then(text => {
        setFiles(f => path in f ? f : { ...f, [path]: text })
        setSaved(f => path in f ? f : { ...f, [path]: text })
      })
      .catch(() => {
        // Editors show an error with Retry; they don't call loadFile again on their own, so this notifies once.
        setFailed(f => new Set([...f, path]))
        notify(`Unable to open '${path.split('/').pop()}': the file could not be read.`, 'error')
      })
      .finally(() => loading.current.delete(path))
  }, [notify])

  const focusCount  = useRef(0)
  const focusEditor = useCallback(() => setEditorFocus(++focusCount.current), [])

  const open = useCallback((input: EditorInput, opts?: OpenOptions) => {
    setEditorsState(s => openEditor(s, input, opts))
    if (isNarrow()) setSidebar(s => ({ ...s, visible: false }))
    if (opts?.preserveFocus) editorRequestsHandled.focus = focusCount.current
    else focusEditor()
  }, [focusEditor])

  // On a phone, start with just the editor.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (isNarrow()) setSidebar(s => ({ ...s, visible: false }))
    setHydrated(true)
  }, [])

  const showView = useCallback((view: ViewId, toggle = false) => {
    setZen(false)
    setSidebar(s => toggle && s.visible && s.view === view ? { ...s, visible: false } : { ...s, visible: true, view })
  }, [])

  const reveal = useCallback((path: string, line: number) => {
    setEditorsState(s => openEditor(s, { type: 'file', path }))
    setRevealLine({ path, line, nonce: Date.now() })
  }, [])

  const wb: WorkbenchApi = useMemo(() => ({
    data, theme, settings, setSetting,
    setTheme: (id: ThemeId) => setSetting('workbench.colorTheme', id),
    editors, setEditors, open, editorFocus, focusEditor,
    fileText: path => files[path],
    loadFile,
    fileFailed: path => failed.has(path),
    editFile: (path, text) => setFiles(f => f[path] === text ? f : { ...f, [path]: text }),
    isDirty: path => path in files && files[path] !== saved[path],
    saveFile: path => {
      if (files[path] === saved[path]) return
      setSaved(s => ({ ...s, [path]: files[path] }))
      notify(`Saved '${path.split('/').pop()}' in this browser tab only. The site's files are read-only.`)
    },
    revertFile: path => setFiles(f => ({ ...f, [path]: saved[path] })),
    sidebar: { visible: sidebar.visible && !zen, view: sidebar.view },
    showView,
    toggleSidebar: () => { setZen(false); setSidebar(s => ({ ...s, visible: !s.visible })) },
    panel: { visible: panel.visible && !zen, view: panel.view, maximized: panel.maximized },
    showPanel: view => { setZen(false); setPanel(p => ({ ...p, visible: true, view })) },
    togglePanel: () => { setZen(false); setPanel(p => ({ ...p, visible: !p.visible })) },
    toggleMaximizedPanel: () => setPanel(p => ({ ...p, visible: true, maximized: !p.maximized })),
    quickInput: (mode, value = '') => setQuick(mode ? { mode, value } : null),
    runCommand: id => {
      if (id === 'internal.zen') { setZen(z => !z); return }
      findCommand(id)?.run(wbRef.current)
    },
    notify,
    showMenu: setMenu,
    cursor, setCursor,
    revealLine, reveal,
  }), [data, theme, settings, setSetting, editors, setEditors, open, editorFocus, focusEditor, files, saved, loadFile, failed, sidebar, zen, panel, showView, notify, cursor, revealLine, reveal])

  const wbRef = useRef(wb)
  wbRef.current = wb

  // Zen hides every clickable way out, so Escape leaves it (unless a menu or picker is open to take the key).
  useEffect(() => {
    if (!zen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !quick && !menu) setZen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zen, quick, menu])

  // Edits only live in this tab; warn before they're lost to a reload or a closed tab.
  const dirty = Object.keys(files).some(p => files[p] !== saved[p])
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Editor navigation history (title bar back/forward).
  const activeId = activeTabOf(editors)?.id ?? null
  useEffect(() => {
    const h = history.current
    if (!activeId || h.stack[h.index] === activeId) return
    h.stack = [...h.stack.slice(0, h.index + 1), activeId].slice(-50)
    h.index = h.stack.length - 1
    bumpHistory(n => n + 1)
  }, [activeId])
  const navigate = (delta: number) => {
    const h = history.current
    for (let i = h.index + delta; i >= 0 && i < h.stack.length; i += delta) {
      const hit = findTab(editors, h.stack[i])
      if (hit) {
        h.index = i
        setEditorsState(s => ({ ...s, activeGroup: hit.group.id, groups: s.groups.map(g => g.id === hit.group.id ? { ...g, active: hit.tab.id } : g) }))
        bumpHistory(n => n + 1)
        return
      }
    }
  }

  // Title bar back/forward, bound like VS Code (Ctrl+- / Ctrl+Shift+- on mac, Alt+Left / Alt+Right elsewhere).
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const delta = matchesKey(e, mac ? 'Ctrl+-' : 'Alt+Left', mac) ? -1 : matchesKey(e, mac ? 'Ctrl+Shift+-' : 'Alt+Right', mac) ? 1 : 0
      if (delta) { e.preventDefault(); navigateRef.current(delta) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mac])

  // Global keybindings, with two-stroke chords (Cmd+K …).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Releasing Cmd between the two strokes of a chord sends a lone modifier keydown; it must not cancel the chord.
      if (e.repeat || ['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return
      const pending = chord.current && Date.now() - chord.current.at < 2000 ? chord.current.first : null
      chord.current = null
      for (const c of COMMANDS) {
        if (!c.key || (c.when && !c.when(wbRef.current))) continue
        const strokes = c.key.split(' ')
        if (strokes.length === 2) {
          if (pending && strokes[0] === pending && matchesKey(e, strokes[1], mac)) { e.preventDefault(); c.run(wbRef.current); return }
        } else if (!pending && matchesKey(e, strokes[0], mac)) {
          e.preventDefault(); e.stopPropagation(); c.run(wbRef.current); return
        }
      }
      if (!pending && COMMANDS.some(c => c.key?.includes(' ') && matchesKey(e, c.key.split(' ')[0], mac))) {
        e.preventDefault(); e.stopPropagation()
        chord.current = { first: COMMANDS.find(c => c.key?.includes(' ') && matchesKey(e, c.key.split(' ')[0], mac))!.key!.split(' ')[0], at: Date.now() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [mac])

  const onTabMenu = ({ x, y, group, tab }: TabMenuRequest) => {
    const path = tab.input.type === 'file' ? tab.input.path : null
    const items: MenuItem[] = [
      { label: 'Close', key: 'Ctrl+Alt+W', run: () => setEditors(s => closeTabs(s, group, [tab.id])) },
      { label: 'Close Others', run: () => setEditors(s => closeOthers(s, group, tab.id)) },
      { label: 'Close to the Right', run: () => setEditors(s => closeToRight(s, group, tab.id)) },
      { label: 'Close All', key: 'Cmd+K W', run: () => setEditors(s => closeTabs(s, group, s.groups.find(g => g.id === group)?.tabs.map(t => t.id) ?? [])) },
      { separator: true },
      ...(path ? [
        { label: 'Copy Path', run: () => navigator.clipboard?.writeText(`/tilalx/${path}`) },
        { label: 'Copy Relative Path', run: () => navigator.clipboard?.writeText(path) },
        { separator: true },
        { label: 'Reveal in Explorer View', run: () => { showView('explorer'); open(tab.input) } },
        { label: 'Open on GitHub', run: () => window.open(`https://github.com/tilalx/tilalx/blob/main/${path}`, '_blank', 'noopener') },
        { separator: true },
      ] as MenuItem[] : []),
      { label: tab.preview ? 'Keep Open' : 'Pin', disabled: !tab.preview, run: () => setEditors(s => pinTab(s, group, tab.id)) },
      { separator: true },
      { label: 'Split Right', run: () => setEditors(s => splitGroup({ ...s, activeGroup: group, groups: s.groups.map(g => g.id === group ? { ...g, active: tab.id } : g) })) },
    ]
    setMenu({ x, y, items })
  }

  const appMenu = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ x: r.right, y: r.top, items: [
      { label: 'Go to File...', key: 'Cmd+P', run: () => setQuick({ mode: 'files', value: '' }) },
      { label: 'Command Palette...', key: 'Cmd+Shift+P', run: () => setQuick({ mode: 'commands', value: '' }) },
      { separator: true },
      { label: 'Toggle Primary Side Bar', key: 'Cmd+B', run: () => wb.toggleSidebar() },
      { label: 'Toggle Panel', key: 'Cmd+J', run: () => wb.togglePanel() },
      { label: 'Zen Mode', key: 'Cmd+K Z', run: () => setZen(z => !z) },
      { separator: true },
      { label: 'Welcome', run: () => open({ type: 'welcome' }) },
      { label: 'View Source on GitHub', run: () => window.open('https://github.com/tilalx/tilalx', '_blank', 'noopener') },
    ] })
  }

  const accountsMenu = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ x: r.right, y: r.bottom, anchorBottom: true, items: [
      { label: 'tilalx (GitHub)', run: () => window.open('https://github.com/tilalx', '_blank', 'noopener') },
      { label: 'Tilo Alexander (LinkedIn)', run: () => window.open('https://www.linkedin.com/in/tilo-alexander', '_blank', 'noopener') },
    ] })
  }

  const manageMenu = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ x: r.right, y: r.bottom, anchorBottom: true, items: [
      { label: 'Command Palette...', key: 'Cmd+Shift+P', run: () => setQuick({ mode: 'commands', value: '' }) },
      { separator: true },
      { label: 'Settings', key: 'Cmd+,', run: () => open({ type: 'settings' }) },
      { label: 'Extensions', key: 'Cmd+Shift+X', run: () => showView('extensions') },
      { separator: true },
      { label: 'Themes', submenuHint: true, run: () => setQuick({ mode: 'themes', value: '' }) },
    ] })
  }

  const style = useMemo(() => themeCssVars(theme) as CSSProperties, [theme])
  const sidebarVisible = sidebar.visible && !zen
  const panelVisible   = panel.visible && !zen
  const [panelOpened, setPanelOpened] = useState(false)
  if (panelVisible && !panelOpened) setPanelOpened(true)

  return (
    <WorkbenchContext.Provider value={wb}>
      <div className={`monaco-workbench ${theme.type === 'dark' ? 'vs-dark' : 'vs'}${zen ? ' zen' : ''}${hydrated ? ' hydrated' : ''}`} style={style}>
        {!zen && (
          <TitleBar
            canGoBack={history.current.index > 0}
            canGoForward={history.current.index < history.current.stack.length - 1}
            onBack={() => navigate(-1)}
            onForward={() => navigate(1)}
          />
        )}
        <div className="wb-body">
          {!zen && <ActivityBar onMenu={appMenu} onAccounts={accountsMenu} onManage={manageMenu} />}
          {sidebarVisible && (
            <div className="sidebar" style={{ width: sidebar.width }}>
              <Sidebar />
              <Sash
                orientation="vertical"
                style={{ right: -2 }}
                size={sidebar.width}
                min={170}
                max={() => window.innerWidth - 48 - 220}
                onChange={w => setSidebar(s => ({ ...s, width: w }))}
                onReset={() => setSidebar(s => ({ ...s, width: SIDEBAR_DEFAULT }))}
                onCollapse={() => setSidebar(s => ({ ...s, visible: false, width: SIDEBAR_DEFAULT }))}
              />
            </div>
          )}
          <div className="wb-main">
            {!(panelVisible && panel.maximized) && <EditorPart onTabMenu={onTabMenu} />}
            {/* Once opened, the panel stays mounted while hidden so the terminal keeps its session. */}
            {panelOpened && (
              <div className="panel-container" style={!panelVisible ? { display: 'none' } : panel.maximized ? { flex: 1 } : { height: panel.height }}>
                {!panel.maximized && (
                  <Sash
                    orientation="horizontal"
                    style={{ top: -2 }}
                    size={panel.height}
                    invert
                    min={77}
                    max={() => window.innerHeight - 35 - 22 - 80}
                    onChange={h => setPanel(p => ({ ...p, height: h }))}
                    onReset={() => setPanel(p => ({ ...p, height: PANEL_DEFAULT }))}
                    onCollapse={() => setPanel(p => ({ ...p, visible: false, height: PANEL_DEFAULT }))}
                  />
                )}
                <Panel />
              </div>
            )}
          </div>
        </div>
        {zen && (
          <button className="action-label zen-exit" title="Exit Zen Mode (Escape)" onClick={() => setZen(false)}>
            <Codicon name="screen-normal" />
          </button>
        )}
        {!zen && <StatusBar onBell={() => notify(notes.length ? `${notes.length} notifications` : 'No new notifications')} />}
        {/* Keyed so switching modes (palette → theme picker) starts fresh instead of keeping the typed text. */}
        {quick && <QuickInput key={`${quick.mode}:${quick.value}`} mode={quick.mode} initialValue={quick.value} onClose={() => setQuick(null)} />}
        {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
        <Notifications items={notes} onDismiss={id => setNotes(n => n.filter(x => x.id !== id))} />
      </div>
    </WorkbenchContext.Provider>
  )
}

