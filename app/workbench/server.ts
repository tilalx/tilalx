import fs   from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import vm from 'vm'
import { README_PATH } from './paths'
import type { Commit, FileNode, GitStatus, Meme, Quote, Repo, StackItem, WorkbenchData } from './types'

// Files are declared for tracing in next.config.ts (outputFileTracingIncludes); the fs calls below
// opt out of Turbopack's static analysis, which would otherwise pull in the whole project.
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

/** Explorer order: folders first, then names compared like VS Code's default `explorer.sortOrder`. */
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

/** The tree is fixed in a built image, so production scans the disk once; dev rescans to pick up edits. */
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

/** Reads a file only if it is part of the Explorer tree, so the route can't be used to read anything else. */
export function readTreeFile(rel: string): string | null {
  if (!filePaths(buildFileTree()).includes(rel)) return null
  try { return fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), 'utf8') }
  catch { return null }
}

function git(args: string): string {
  try { return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  catch { return '' }
}

function gitStatus(): Record<string, GitStatus> {
  const out: Record<string, GitStatus> = {}
  for (const line of git('status --porcelain -uall').split('\n').filter(Boolean)) {
    const code = line.slice(0, 2)
    // Renames read "old -> new"; the Explorer shows the new path. Paths with spaces come quoted.
    const file = line.slice(3).split(' -> ').pop()!.replace(/^"|"$/g, '').replace(/\/$/, '')
    out[file] = code === '??' ? 'U' : code.includes('A') ? 'A' : code.includes('D') ? 'D' : 'M'
  }
  return out
}

/** Upstream APIs are awaited on every page view, so a hung one must not hang the site. */
const UPSTREAM_TIMEOUT = 3000 // ms

interface QuoteApiItem { content: string; author: string; tags: string }
interface MemeApiItem  { url?: string; preview?: string[] }
interface GhRepo {
  name: string; description: string | null; language: string | null
  stargazers_count: number; pushed_at: string; fork: boolean; html_url: string
}

/**
 * Strips surrounding quote marks, and repairs apostrophes the quotes API stores as `$`
 * ("don$t" → "don’t"). Only a `$` between two letters is touched, so amounts like "$5" survive.
 */
function cleanQuote(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/(\p{L})\$(\p{L})/gu, '$1’$2')
    .trim()
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  // The API sometimes repeats a tag ("Wisdom, Wisdom").
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
    const res = await fetch(`https://quotes.aelx.de/random?count=${count}`, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    return ((await res.json() || []) as QuoteApiItem[]).map(q => ({
      content: cleanQuote(q.content), author: q.author, tags: parseTags(q.tags),
    }))
  } catch { return [] }
}

export async function fetchMemes(count = 10): Promise<Meme[]> {
  try {
    const res = await fetch(`https://meme-api.aelx.de/gimme/${count}`, { cache: 'no-store', signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.memes || []) as MemeApiItem[])
      .filter((m): m is MemeApiItem & { url: string } => !!m.url)
      // The meme API can return the same post twice in one batch.
      .filter((m, i, all) => all.findIndex(x => x.url === m.url) === i)
      .map(m => ({ url: m.url, thumb: pickMemeUrl(m.preview, m.url) }))
  } catch { return [] }
}

async function fetchRepos(): Promise<{ repos: Repo[]; stack: StackItem[] }> {
  try {
    const res = await fetch('https://api.github.com/users/tilalx/repos?sort=pushed&per_page=100', { next: { revalidate: 60 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
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
    const res = await fetch('https://api.github.com/repos/tilalx/tilalx/commits?per_page=15', { next: { revalidate: 60 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT) })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export async function loadWorkbenchData(): Promise<WorkbenchData> {
  const [quotes, memes, { repos, stack }, commits] = await Promise.all([fetchQuotes(), fetchMemes(), fetchRepos(), fetchCommits()])
  const readme = readTreeFile(README_PATH)
  return {
    tree:   buildFileTree(),
    files:  readme === null ? {} : { [README_PATH]: readme },
    git:    gitStatus(),
    branch: git('rev-parse --abbrev-ref HEAD') || 'main',
    repos, stack, quotes, memes, commits,
  }
}

export interface SearchMatch { line: number; text: string; start: number; end: number }
export interface SearchResult { path: string; matches: SearchMatch[] }

const MAX_MATCHES   = 2000
const SEARCH_BUDGET = 1000 // ms

/**
 * Runs in a vm context so the time budget can interrupt the regex: the pattern comes from the
 * request, and a catastrophic one like `(a+)+$` would otherwise block the server's event loop.
 */
const MATCHER = new vm.Script(`
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
  JSON.stringify(results)
`)

export function searchTree(query: string, opts: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }): SearchResult[] | { error: string } {
  let re: RegExp
  try {
    const src = opts.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    re = new RegExp(opts.wholeWord ? `\\b(?:${src})\\b` : src, opts.caseSensitive ? 'g' : 'gi')
  } catch (e) {
    return { error: (e as Error).message }
  }
  const files: [string, string][] = []
  for (const rel of filePaths(buildFileTree())) {
    if (rel === 'yarn.lock' || /\.(woff2?|ttf|png|jpe?g|ico)$/i.test(rel)) continue
    try { files.push([rel, fs.readFileSync(path.join(/*turbopackIgnore: true*/ ROOT, rel), 'utf8')]) } catch {}
  }
  try {
    // JSON keeps objects created inside the context from leaking its prototypes out.
    return JSON.parse(MATCHER.runInNewContext({ files, re, max: MAX_MATCHES }, { timeout: SEARCH_BUDGET }))
  } catch {
    return { error: 'Search took too long. Try a simpler pattern.' }
  }
}
