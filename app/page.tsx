import fs      from 'fs'
import path    from 'path'
import { execSync } from 'child_process'
import { Suspense } from 'react'
import IDEApp       from './IDEApp'
import ReadmeEditor, { fetchRepos } from './ide/ReadmeEditor'
import { stripQuotes, parseTags, pickMemeUrl } from './ide/utils'
import type { Commit, FileNode, Meme, Quote } from './ide/types'

interface QuoteApiItem { content: string; author: string; tags: string }
interface MemeApiItem  { url?: string; preview?: string[] }

const ROOT_FILE_NAMES = ['ReadMe.md', 'package.json', 'next.config.ts', 'tsconfig.json', 'Dockerfile', '.gitignore']
const INCLUDE_SUBDIRS = ['app', 'public']
const IGNORE_NAMES    = new Set(['node_modules', '.next', 'dist', '.git', 'yarn.lock', 'package-lock.json'])

const EXT_COLOR_MAP: Record<string, string> = {
  jsx: '#519aba', js: '#cbcb41', ts: '#3178c6', tsx: '#519aba',
  css: '#6196cc', json: '#cbcb41', md: '#519aba', svg: '#ffb13b', txt: 'var(--ide-fg2)',
}

function fileExt(name: string): string {
  if (name === 'Dockerfile') return 'dock'
  if (name === '.gitignore') return 'git'
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
}

function fileColor(name: string): string {
  if (name === 'Dockerfile') return '#2496ed'
  if (name === '.gitignore') return '#f1502f'
  return EXT_COLOR_MAP[fileExt(name)] || 'var(--ide-fg2)'
}

function fileNode(name: string, relPath: string, modifiedFiles: Set<string>): FileNode {
  return {
    name, path: relPath,
    ext: fileExt(name), color: fileColor(name),
    ...(modifiedFiles.has(relPath) ? { modified: true } : {}),
  }
}

function scanDir(absPath: string, relBase: string, modifiedFiles: Set<string>): FileNode[] {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(absPath, { withFileTypes: true }) }
  catch { return [] }

  return entries
    .filter(e => !IGNORE_NAMES.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((e): FileNode => {
      const relPath = `${relBase}/${e.name}`
      if (e.isDirectory()) {
        return {
          name: e.name, type: 'folder', color: '#dcb67a', open: false,
          children: scanDir(path.join(absPath, e.name), relPath, modifiedFiles),
        }
      }
      return fileNode(e.name, relPath, modifiedFiles)
    })
}

function buildFileTree(root: string): FileNode[] {
  let modifiedFiles = new Set<string>()
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
    modifiedFiles = new Set(out.trim().split('\n').filter(Boolean))
  } catch {}

  const tree: FileNode[] = []

  ROOT_FILE_NAMES.forEach(name => {
    if (fs.existsSync(path.join(root, name))) tree.push(fileNode(name, name, modifiedFiles))
  })

  INCLUDE_SUBDIRS.forEach(dir => {
    const abs = path.join(root, dir)
    if (fs.existsSync(abs)) {
      tree.push({
        name: dir, type: 'folder', color: '#dcb67a', open: true,
        children: scanDir(abs, dir, modifiedFiles),
      })
    }
  })

  return tree
}

function flattenFilePaths(tree: FileNode[]): string[] {
  const paths: string[] = []
  for (const item of tree) {
    if (item.type === 'folder') paths.push(...flattenFilePaths(item.children || []))
    else if (item.path) paths.push(item.path)
  }
  return paths
}

function getFileContents(filePaths: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  filePaths.forEach(f => {
    try { out[f] = fs.readFileSync(path.join(process.cwd(), f), 'utf8') }
    catch { out[f] = `// could not read ${f}` }
  })
  return out
}

async function getInitialQuotes(count = 10): Promise<Quote[]> {
  try {
    const res  = await fetch(`https://quotes.aelx.de/random?count=${count}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return ((data || []) as QuoteApiItem[]).map(q => ({
      content: stripQuotes(q.content),
      author:  q.author,
      tags:    parseTags(q.tags),
    }))
  } catch { return [] }
}

async function getInitialMemes(count = 10): Promise<Meme[]> {
  try {
    const res  = await fetch(`https://meme-api.aelx.de/gimme/${count}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.memes || []) as MemeApiItem[])
      .filter((m): m is MemeApiItem & { url: string } => !!m.url)
      .map(m => ({ url: m.url, thumb: pickMemeUrl(m.preview, m.url) }))
  } catch { return [] }
}

async function warmContributionYears() {
  const current = new Date().getFullYear()
  const years   = Array.from({ length: current - 2020 + 1 }, (_, i) => 2020 + i)
  for (const y of years) {
    await fetch(`https://github-contributions-api.jogruber.de/v4/tilalx?y=${y}`, {
      next: { revalidate: y < current ? 31536000 : 3600 },
    }).catch(() => {})
    await new Promise(r => setTimeout(r, 200))
  }
}

async function getInitialCommits(): Promise<Commit[]> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/tilalx/tilalx/commits?per_page=15',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export default async function HomePage() {
  warmContributionYears()
  const [initialQuotes, initialMemes, { repos, stack }, initialCommits] = await Promise.all([
    getInitialQuotes(),
    getInitialMemes(),
    fetchRepos(),
    getInitialCommits(),
  ])

  const fileTree = buildFileTree(process.cwd())

  return (
    <main style={{ display: 'contents' }}>
      <IDEApp
        initialQuotes={initialQuotes}
        initialMemes={initialMemes}
        initialCommits={initialCommits}
        repos={repos}
        stack={stack}
        fileTree={fileTree}
        fileContents={getFileContents(flattenFilePaths(fileTree))}
        readmeContent={
          <Suspense key="readme" fallback={<ReadmeFallback />}>
            <ReadmeEditor />
          </Suspense>
        }
      />
    </main>
  )
}

function ReadmeFallback() {
  return (
    <div className="ide-editor-scroll">
      <div className="ide-editor-body">
        <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="ide-skeleton" style={{ height: 14, width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
