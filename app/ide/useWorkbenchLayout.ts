import { useEffect, useRef, useState } from 'react'
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from 'react'
import { deserializeEditor, serializeEditor } from './editor'
import type { EditorState, TerminalGroup } from './types'

export type BottomTab = 'problems' | 'output' | 'debug-console' | 'terminal' | 'ports'

function dragResize(e: ReactPointerEvent, cursor: string, onMove: (ev: PointerEvent) => void) {
  e.preventDefault()
  document.body.style.cursor = cursor
  document.body.style.userSelect = 'none'
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// Saved layout is restored after mount so the server and first client render match.
export function useWorkbenchLayout(editor: EditorState, setEditor: Dispatch<SetStateAction<EditorState>>) {
  const [terminals,        setTerminals]        = useState<TerminalGroup[]>([{ id: 1, name: 'fish', panes: [1] }])
  const [activeTerminalId, setActiveTerminalId] = useState<number | null>(1)
  const [bottomTab,        setBottomTab]        = useState<BottomTab>('terminal')
  const [panelHeight,      setPanelHeight]      = useState(230)
  const [panelMaximized,   setPanelMaximized]   = useState(false)
  const [panelCollapsed,   setPanelCollapsed]   = useState(false)
  const [sidebarWidth,     setSidebarWidth]     = useState(240)
  const [sidebarVisible,   setSidebarVisible]   = useState(true)
  const [secondaryVisible, setSecondaryVisible] = useState(false)

  const termIdRef = useRef(2)
  const paneIdRef = useRef(2)

  useEffect(() => {
    let w: Record<string, any>
    try { w = JSON.parse(localStorage.getItem('ide-workbench') || '{}') } catch { return }
    if (typeof w.panelHeight === 'number')       setPanelHeight(w.panelHeight)
    if (typeof w.panelMaximized === 'boolean')   setPanelMaximized(w.panelMaximized)
    if (typeof w.panelCollapsed === 'boolean')   setPanelCollapsed(w.panelCollapsed)
    if (typeof w.sidebarWidth === 'number')      setSidebarWidth(w.sidebarWidth)
    if (typeof w.sidebarVisible === 'boolean')   setSidebarVisible(w.sidebarVisible)
    if (typeof w.secondaryVisible === 'boolean') setSecondaryVisible(w.secondaryVisible)
    if (Array.isArray(w.terminals) && w.terminals.length) {
      const valid: TerminalGroup[] = w.terminals.filter((t: TerminalGroup | null) => t && Array.isArray(t.panes) && t.panes.length)
      if (valid.length) {
        setTerminals(valid)
        termIdRef.current = Math.max(0, ...valid.map(t => t.id)) + 1
        paneIdRef.current = Math.max(0, ...valid.flatMap(t => t.panes)) + 1
        setActiveTerminalId(valid.some(t => t.id === w.activeTerminalId) ? w.activeTerminalId : valid[valid.length - 1].id)
      }
    }
    if (w.editor) { const restored = deserializeEditor(w.editor); if (restored) setEditor(restored) }
  }, [setEditor])

  // Skip the first run so the defaults don't overwrite what was saved.
  const firstWriteRef = useRef(true)
  useEffect(() => {
    if (firstWriteRef.current) { firstWriteRef.current = false; return }
    const data = { terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible, secondaryVisible, editor: serializeEditor(editor) }
    try { localStorage.setItem('ide-workbench', JSON.stringify(data)) } catch {}
  }, [terminals, activeTerminalId, panelHeight, panelMaximized, panelCollapsed, sidebarWidth, sidebarVisible, secondaryVisible, editor])

  const showTerminalPanel = () => { setBottomTab('terminal'); setPanelCollapsed(false) }

  const addTerminal = () => {
    const id = termIdRef.current++
    const paneId = paneIdRef.current++
    setTerminals(p => [...p, { id, name: `fish ${p.length + 1}`, panes: [paneId] }])
    setActiveTerminalId(id)
    showTerminalPanel()
  }

  const splitTerminal = () => {
    if (!terminals.some(g => g.id === activeTerminalId)) { addTerminal(); return }
    const paneId = paneIdRef.current++
    setTerminals(prev => prev.map(g => g.id === activeTerminalId ? { ...g, panes: [...g.panes, paneId] } : g))
    showTerminalPanel()
  }

  const closeTerminal = (id: number) => {
    const remaining = terminals.filter(t => t.id !== id)
    setTerminals(remaining)
    setActiveTerminalId(cur => (cur === id ? (remaining.at(-1)?.id ?? null) : cur))
  }

  const closePane = (groupId: number, paneId: number) => {
    setTerminals(prev => prev.map(g => g.id === groupId ? { ...g, panes: g.panes.filter(p => p !== paneId) } : g))
  }

  const renameTerminal = (id: number, name: string) => {
    setTerminals(prev => prev.map(g => g.id === id ? { ...g, name } : g))
  }

  const toggleMaximizedPanel = () => { setPanelMaximized(m => !m); setPanelCollapsed(false) }

  const startPanelResize = (e: ReactPointerEvent) => {
    if (panelMaximized || panelCollapsed) return
    const startY = e.clientY
    dragResize(e, 'row-resize', ev => setPanelHeight(Math.min(Math.max(panelHeight + startY - ev.clientY, 80), window.innerHeight - 160)))
  }

  const startSidebarResize = (e: ReactPointerEvent) => {
    const startX = e.clientX
    dragResize(e, 'col-resize', ev => setSidebarWidth(Math.min(Math.max(sidebarWidth + ev.clientX - startX, 150), 500)))
  }

  return {
    terminals, activeTerminalId, setActiveTerminalId, addTerminal, splitTerminal, closeTerminal, closePane, renameTerminal,
    bottomTab, setBottomTab,
    panelHeight, panelMaximized, toggleMaximizedPanel, panelCollapsed, setPanelCollapsed, startPanelResize,
    sidebarWidth, sidebarVisible, setSidebarVisible, startSidebarResize,
    secondaryVisible, setSecondaryVisible,
  }
}

export type WorkbenchLayout = ReturnType<typeof useWorkbenchLayout>
