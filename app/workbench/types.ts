export interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

/** Git status letter as VS Code's SCM decorations show it. */
export type GitStatus = 'M' | 'U' | 'A' | 'D'

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

export interface WorkbenchData {
  tree: FileNode[]
  files: Record<string, string>
  git: Record<string, GitStatus>
  branch: string
  repos: Repo[]
  stack: StackItem[]
  quotes: Quote[]
  memes: Meme[]
  commits: Commit[]
}

/** Everything that can be open in an editor tab. */
export type EditorInput =
  | { type: 'file'; path: string }
  | { type: 'preview'; path: string }
  | { type: 'welcome' }
  | { type: 'settings' }
  | { type: 'extension'; name: string }
  | { type: 'memes' }
  | { type: 'quotes' }
  | { type: 'contributions' }

export interface Tab { id: string; input: EditorInput; preview: boolean }
export interface Group { id: number; tabs: Tab[]; active: string | null; mru: string[] }
