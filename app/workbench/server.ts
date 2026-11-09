import fs   from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { Worker } from 'worker_threads'
import { README_PATH } from './paths'
import { timeAgo } from './format'
import type { Commit, FileNode, GitStatus, Meme, Quote, Repo, StackItem, WorkbenchData } from './types'

const ROOT = process.cwd()

const ROOT_FILES = ['.dockerignore', '.gitignore', '.yarnrc.yml', 'Dockerfile', 'Jenkinsfile', 'next.config.ts', 'package.json', 'ReadMe.md', 'tsconfig.json']
const ROOT_DIRS  = ['.github', 'app', 'public']
const IGNORE     = new Set(['node_modules', '.next', '.git', '.DS_Store'])


const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Java: '#b07219', Vue: '#41b883', Python: '#3572a5',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', CSS: '#563d7c', HTML: '#e34c26', Go: '#00add8',
  Rust: '#dea584', Shell: '#89e051', Kotlin: '#a97bff', Swift: '#f05138', Ruby: '#701516', PHP: '#4f5d95',
  Dart: '#00b4ab', Nix: '#7e7eff', HCL: '#844fba', Dockerfile: '#384d54', Groovy: '#4298b8',
}

function compareEntries(a: FileNode, b: FileNode): number {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

function scanDir(rel: string): FileNode[] {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), { withFileTypes: true }) }
  catch { return [] }
  return entries
    .filter(e => !IGNORE.has(e.name))
    .map((e): FileNode => {
      const p = `${rel}/${e.name}`
      return e.isDirectory()
        ? { name: e.name, path: p, type: 'folder', children: scanDir(p) }
        : { name: e.name, path: p, type: 'file' }
    })
    .sort(compareEntries)
}

let cachedTree: FileNode[] | null = null

export function buildFileTree(): FileNode[] {
  if (cachedTree && process.env.NODE_ENV === 'production') return cachedTree
  cachedTree = scanTree()
  return cachedTree
}

function scanTree(): FileNode[] {
  const nodes: FileNode[] = []
  for (const dir of ROOT_DIRS) {
    if (fs.existsSync(path.join(/*turbopackIgnore: true*/ ROOT, dir))) nodes.push({ name: dir, path: dir, type: 'folder', children: scanDir(dir) })
  }
  for (const name of ROOT_FILES) {
    if (fs.existsSync(path.join(/*turbopackIgnore: true*/ ROOT, name))) nodes.push({ name, path: name, type: 'file' })
  }
  return nodes.sort(compareEntries)
}

export function filePaths(tree: FileNode[]): string[] {
  return tree.flatMap(n => n.type === 'folder' ? filePaths(n.children ?? []) : [n.path])
}

export function readTreeFile(rel: string): string | null {
  if (!filePaths(buildFileTree()).includes(rel)) return null
  try { return fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), 'utf8') }
  catch { return null }
}

function git(args: string): string {
  try { return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { return '' }
}

let cachedGit: { status: Record<string, GitStatus>; branch: string } | null = null

// Git state only changes in dev; in production it is fixed for the life of the process.
function gitInfo(): { status: Record<string, GitStatus>; branch: string } {
  if (cachedGit && process.env.NODE_ENV === 'production') return cachedGit
  cachedGit = { status: gitStatus(), branch: git('rev-parse --abbrev-ref HEAD') || 'main' }
  return cachedGit
}

function gitStatus(): Record<string, GitStatus> {
  const out: Record<string, GitStatus> = {}
  for (const line of git('status --porcelain -uall').split('\n').filter(Boolean)) {
    const code = line.slice(0, 2)
    const file = line.slice(3).split(' -> ').pop()!.replace(/^"|"$/g, '').replace(/\/$/, '')
    out[file] = code === '??' ? 'U' : code.includes('A') ? 'A' : code.includes('D') ? 'D' : 'M'
  }
  return out
}

const UPSTREAM_TIMEOUT = 3000
const POOL_SIZE        = 50
const POOL_REVALIDATE  = 60
// Unauthenticated GitHub API allows 60 requests/hour per IP.
const GITHUB_REVALIDATE = 3600

// Upstreams are fetched as a cached pool; each request gets its own random pick from it.
function sample<T>(pool: T[], count: number): T[] {
  const a = [...pool]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, count)
}

interface QuoteApiItem { content: string; author: string; tags: string }
interface MemeApiItem  { url?: string; preview?: string[]; title?: string; postLink?: string; subreddit?: string; author?: string; ups?: number }
interface GhRepo {
  name: string; description: string | null; language: string | null
  stargazers_count: number; pushed_at: string; fork: boolean; html_url: string
}

function cleanQuote(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/(\p{L})\$(\p{L})/gu, '$1’$2')
    .trim()
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  return [...new Set(raw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean))]
}

export function pickMemeUrl(preview: string[] | null | undefined, fallback: string | null | undefined, targetWidth = 500): string {
  if (preview?.length) {
    const sized = preview
      .map(p => { const m = p.match(/[?&]width=(\d+)/); return { url: p, w: m ? +m[1] : 0 } })
      .filter(p => p.w > 0)
      .sort((a, b) => a.w - b.w)
    if (sized.length) return (sized.find(p => p.w >= targetWidth) ?? sized.at(-1))!.url
  }
  return fallback || ''
}

export async function fetchQuotes(count = 10): Promise<Quote[]> {
  try {
    const res = await fetch(`https://quotes.aelx.de/random?count=${POOL_SIZE}`, { next: { revalidate: POOL_REVALIDATE }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    return sample((await res.json() || []) as QuoteApiItem[], count).map(q => ({
      content: cleanQuote(q.content), author: q.author, tags: parseTags(q.tags),
    }))
  } catch { return [] }
}

export async function fetchMemes(count = 30, subreddit?: string): Promise<Meme[]> {
  try {
    const res = await fetch(`https://meme-api.aelx.de/gimme/${subreddit ? `${subreddit}/` : ''}${POOL_SIZE}?nsfw=false&spoiler=false`, { next: { revalidate: POOL_REVALIDATE }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    const data = await res.json()
    return sample(((data.memes || []) as MemeApiItem[])
      .filter((m): m is MemeApiItem & { url: string } => !!m.url)
      .filter((m, i, all) => all.findIndex(x => x.url === m.url) === i), count)
      .map(m => ({
        url: m.url, thumb: pickMemeUrl(m.preview, m.url), title: m.title ?? '', postLink: m.postLink ?? m.url,
        subreddit: m.subreddit ?? '', author: m.author ?? '', ups: m.ups ?? 0,
      }))
  } catch { return [] }
}

async function fetchRepos(): Promise<{ repos: Repo[]; stack: StackItem[] }> {
  try {
    const res = await fetch('https://api.github.com/users/tilalx/repos?sort=pushed&per_page=100', { next: { revalidate: GITHUB_REVALIDATE }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return { repos: [], stack: [] }
    const repos: Repo[] = (await res.json() as GhRepo[]).map(r => ({
      name: r.name, description: r.description, language: r.language,
      stars: r.stargazers_count, pushed_at: r.pushed_at, fork: r.fork, url: r.html_url,
    }))
    const stack = [...new Set(repos.flatMap(r => r.language ? [r.language] : []))]
      .map(name => ({ name, color: LANG_COLORS[name] ?? '#858585' }))
    return { repos, stack }
  } catch { return { repos: [], stack: [] } }
}

async function fetchCommits(): Promise<Commit[]> {
  try {
    const res = await fetch('https://api.github.com/repos/tilalx/tilalx/commits?per_page=15', { next: { revalidate: GITHUB_REVALIDATE }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export function withLiveRepos(readme: string, repos: Repo[], count = 8): string {
  const recent = repos.slice(0, count)
  if (!recent.length) return readme
  const width = Math.max(...recent.map(r => r.name.length)) + 2
  const rows = recent.map(r => {
    const desc = (r.description ?? '').replace(/\s+/g, ' ').trim()
    const ago  = timeAgo(r.pushed_at)
    const meta = [r.language, r.fork && 'fork', ago === 'now' ? 'just now' : `${ago} ago`].filter(Boolean).join(' · ')
    const text = desc.length > 44 ? `${desc.slice(0, 43)}…` : desc
    return `${r.name.padEnd(width)}${text.padEnd(46)}${meta}`
  })
  return readme.replace(/(<!-- repos:start -->\n)[\s\S]*?(\n<!-- repos:end -->)/, `$1\`\`\`\n${rows.join('\n')}\n\`\`\`$2`)
}

export async function loadWorkbenchData(): Promise<WorkbenchData> {
  const [quotes, memes, { repos, stack }, commits] = await Promise.all([fetchQuotes(), fetchMemes(), fetchRepos(), fetchCommits()])
  const readme = readTreeFile(README_PATH)
  const { status, branch } = gitInfo()
  return {
    tree:   buildFileTree(),
    files:  readme === null ? {} : { [README_PATH]: withLiveRepos(readme, repos) },
    git:    status,
    branch,
    repos, stack, quotes, memes, commits,
  }
}

export interface SearchMatch { line: number; text: string; start: number; end: number }
export interface SearchResult { path: string; matches: SearchMatch[] }

const MAX_MATCHES   = 2000
const SEARCH_BUDGET = 1000

const MAX_SEARCHES  = 4
let running = 0

const MATCHER = `
  const { parentPort, workerData: { files, source, flags, max } } = require('worker_threads')
  const re = new RegExp(source, flags)
  const results = []
  let total = 0
  for (const [rel, text] of files) {
    const matches = []
    const lines = text.split('\\n')
    for (let i = 0; i < lines.length && total < max; i++) {
      const line = lines[i]
      re.lastIndex = 0
      for (let m = re.exec(line); m && total < max; m = re.exec(line)) {
        if (m[0].length === 0) { re.lastIndex++; continue }
        const from = Math.max(0, m.index - 100)
        matches.push({ line: i + 1, text: line.slice(from, m.index + m[0].length + 300), start: m.index - from, end: m.index - from + m[0].length })
        total++
      }
    }
    if (matches.length) results.push({ path: rel, matches })
  }
  parentPort.postMessage(results)
`

let cachedFiles: [string, string][] | null = null

function searchableFiles(): [string, string][] {
  if (cachedFiles && process.env.NODE_ENV === 'production') return cachedFiles
  const files: [string, string][] = []
  for (const rel of filePaths(buildFileTree())) {
    if (rel === 'yarn.lock' || /\.(woff2?|ttf|png|jpe?g|ico)$/i.test(rel)) continue
    try { files.push([rel, fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), 'utf8')]) } catch {}
  }
  cachedFiles = files
  return files
}

export async function searchTree(query: string, opts: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }): Promise<SearchResult[] | { error: string }> {
  let re: RegExp
  try {
    const src = opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(opts.wholeWord ? `\\b(?:${src})\\b` : src, opts.caseSensitive ? 'g' : 'gi')
  } catch (e) {
    return { error: (e as Error).message }
  }
  if (running >= MAX_SEARCHES) return { error: 'Search is busy. Try again in a moment.' }
  running++
  try {
    return await new Promise(resolve => {
      const worker = new Worker(MATCHER, { eval: true, workerData: { files: searchableFiles(), source: re.source, flags: re.flags, max: MAX_MATCHES } })
      const timer = setTimeout(() => { worker.terminate(); resolve({ error: 'Search took too long. Try a simpler pattern.' }) }, SEARCH_BUDGET)
      worker.once('message', (r: SearchResult[]) => { clearTimeout(timer); worker.terminate(); resolve(r) })
      worker.once('error', () => { clearTimeout(timer); resolve({ error: 'Search failed.' }) })
    })
  } finally {
    running--
  }
}
