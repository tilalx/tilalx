export interface FileNode {
  name: string
  path?: string
  type?: 'folder'
  ext?: string
  color: string
  open?: boolean
  modified?: boolean
  children?: FileNode[]
}

export interface Repo {
  name: string
  description: string | null
  language: string | null
  stars: number
  pushed_at: string
  fork: boolean
  url: string
}

export interface StackItem { name: string; color: string }
export interface Quote { content: string; author: string; tags: string[] }
export interface Meme { url: string; thumb: string }

export interface Commit {
  sha: string
  html_url: string
  commit: { message: string; author: { name: string; date: string } }
}

export type Settings = Record<string, unknown>
export type ThemeVars = Record<string, string>

export type TabKind = 'readme' | 'memes' | 'quotes' | 'file'
export interface TabSpec { kind: TabKind; file?: string; line?: number }
export interface Tab extends TabSpec { id: string; preview: boolean; pinned: boolean }
export interface Group { id: string; tabs: Tab[]; activeTabId: string; mru: string[] }
export interface EditorState { groups: Group[]; activeGroupId: string; seq: number }

export interface Problem { severity: 'error' | 'warning' | 'info'; file: string; msg: string }

export interface TerminalGroup { id: number; name: string; panes: number[] }

export interface NetworkEntry { url: string; ok: boolean; ms: number }

export interface GhRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  pushed_at: string
  fork: boolean
  html_url: string
}
