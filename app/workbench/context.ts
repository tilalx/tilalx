'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import type { EditorsState, OpenOptions } from './editors/model'
import type { ResolvedTheme, ThemeId } from './theme'
import type { Settings } from './settings'
import type { EditorInput, WorkbenchData } from './types'
import type { MenuRequest } from './parts/ContextMenu'

export type ViewId = 'explorer' | 'search' | 'scm' | 'run' | 'extensions'
export type PanelId = 'problems' | 'output' | 'debug' | 'terminal' | 'ports'
export type QuickMode = 'files' | 'commands' | 'symbols' | 'line' | 'themes'

export interface Cursor { line: number; column: number; selected: number }

export interface Workbench {
  data: WorkbenchData
  theme: ResolvedTheme
  setTheme(id: ThemeId): void
  settings: Settings
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void

  editors: EditorsState
  setEditors(fn: (s: EditorsState) => EditorsState): void
  open(input: EditorInput, opts?: OpenOptions): void
  editorFocus: number
  focusEditor(): void

  fileText(path: string): string | undefined
  loadFile(path: string): void
  fileFailed(path: string): boolean
  editFile(path: string, text: string): void
  isDirty(path: string): boolean
  saveFile(path: string): void
  revertFile(path: string): void

  sidebar: { visible: boolean; view: ViewId }
  showView(view: ViewId, toggle?: boolean): void
  toggleSidebar(): void

  panel: { visible: boolean; view: PanelId; maximized: boolean }
  showPanel(view: PanelId): void
  togglePanel(): void
  toggleMaximizedPanel(): void

  quickInput(mode: QuickMode | null, value?: string): void
  runCommand(id: string): void
  notify(message: string, severity?: 'info' | 'warning' | 'error'): void
  showMenu(menu: MenuRequest): void

  cursor: Cursor
  setCursor(c: Cursor): void
  revealLine: { path: string; line: number; nonce: number } | null
  reveal(path: string, line: number): void
}

export const WorkbenchContext = createContext<Workbench | null>(null)

export function useWorkbench(): Workbench {
  const wb = useContext(WorkbenchContext)
  if (!wb) throw new Error('useWorkbench outside <Workbench>')
  return wb
}

const subscribeNothing = () => () => {}

export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  )
}

export const editorRequestsHandled = { focus: 0, reveal: 0 }
