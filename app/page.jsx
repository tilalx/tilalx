import fs      from 'fs'
import path    from 'path'
import { execSync } from 'child_process'
import { Suspense } from 'react'
import IDEApp       from './IDEApp'
import ReadmeEditor from './ide/ReadmeEditor'
import { LANG_COLORS } from './ide/constants'
import { stripQuotes, parseTags, pickMemeUrl } from './ide/utils'

const ROOT_FILE_NAMES = ['README.md', 'package.json', 'next.config.js', 'Dockerfile', '.gitignore']
const INCLUDE_SUBDIRS = ['app', 'public']
const IGNORE_NAMES    = new Set(['node_modules', '.next', 'dist', '.git', 'yarn.lock', 'package-lock.json'])

const EXT_COLOR_MAP = {
  jsx: '#519aba', js: '#cbcb41', ts: '#3178c6', tsx: '#519aba',
  css: '#6196cc', json: '#cbcb41', md: '#519aba', svg: '#ffb13b', txt: '#a6adc8',
}

function fileExt(name) {
  if (name === 'Dockerfile') return 'dock'
  if (name === '.gitignore') return 'git'
  return name.includes('.') ? name.split('.').pop().toLowerCase() : ''
}

function fileColor(name) {
  if (name === 'Dockerfile') return '#2496ed'
  if (name === '.gitignore') return '#f1502f'
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return EXT_COLOR_MAP[ext] || '#a6adc8'
}

function scanDir(absPath, relBase, modifiedFiles) {
  let entries
  try { entries = fs.readdirSync(absPath, { withFileTypes: true }) }
  catch { return [] }

  return entries
    .filter(e => !IGNORE_NAMES.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map(e => {
      const relPath = `${relBase}/${e.name}`
      if (e.isDirectory()) {
        return {
          name: e.name, type: 'folder', color: '#dcb67a', open: false,
          children: scanDir(path.join(absPath, e.name), relPath, modifiedFiles),
        }
      }
      return {
        name: e.name, path: relPath,
        ext: fileExt(e.name), color: fileColor(e.name),
        ...(modifiedFiles.has(relPath) ? { modified: true } : {}),
      }
    })
}

function buildFileTree(root) {
  let modifiedFiles = new Set()
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
    out.trim().split('\n').filter(Boolean).forEach(f => modifiedFiles.add(f))
  } catch {}

  const tree = []

  ROOT_FILE_NAMES.forEach(name => {
    if (fs.existsSync(path.join(root, name))) {
      tree.push({
        name, path: name,
        ext: fileExt(name), color: fileColor(name),
        ...(modifiedFiles.has(name) ? { modified: true } : {}),
      })
    }
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

function flattenFilePaths(tree) {
  const paths = []
  for (const item of tree) {
    if (item.type === 'folder') paths.push(...flattenFilePaths(item.children || []))
    else if (item.path) paths.push(item.path)
  }
  return paths
}

function getFileContents(filePaths) {
  const out = {}
  filePaths.forEach(f => {
    try { out[f] = fs.readFileSync(path.join(process.cwd(), f), 'utf8') }
    catch { out[f] = `// could not read ${f}` }
  })
  return out
}

async function getInitialQuotes(count = 10) {
  try {
    const res  = await fetch(`https://quotes.aelx.de/random?count=${count}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map(q => ({
      content: stripQuotes(q.content),
      author:  q.author,
      tags:    parseTags(q.tags),
    }))
  } catch { return [] }
}

async function getInitialMemes(count = 10) {
  try {
    const res  = await fetch(`https://meme-api.aelx.de/gimme/${count}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.memes || [])
      .filter(m => m.url)
      .map(m => ({ url: m.url, thumb: pickMemeUrl(m.preview, m.url) }))
  } catch { return [] }
}

async function warmContributionYears() {
  const current = new Date().getFullYear()
  const years   = Array.from({ length: current - 2020 + 1 }, (_, i) => 2020 + i)
  for (const y of years) {
    const isPast = y < current
    await fetch(`https://github-contributions-api.jogruber.de/v4/tilalx?y=${y}`, {
      next: { revalidate: isPast ? 31536000 : 3600 },
    }).catch(() => {})
    await new Promise(r => setTimeout(r, 200))
  }
}

async function getInitialCommits() {
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

async function getReposAndStack() {
  try {
    const res = await fetch(
      'https://api.github.com/users/tilalx/repos?sort=pushed&per_page=100',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return { repos: [], stack: [] }
    const data  = await res.json()
    const repos = data.map(r => ({
      name: r.name, description: r.description, language: r.language,
      stars: r.stargazers_count, pushed_at: r.pushed_at, fork: r.fork, url: r.html_url,
    }))
    const seen = new Set()
    const stack = []
    for (const r of repos) {
      if (r.language && !seen.has(r.language)) {
        seen.add(r.language)
        stack.push({ name: r.language, color: LANG_COLORS[r.language] || '#6c7086' })
      }
    }
    return { repos, stack }
  } catch { return { repos: [], stack: [] } }
}

export const metadata = {
  title: 'tilalx',
  description: 'Personal page — Tilo Alexander',
}

export default async function HomePage() {
  warmContributionYears()
  const [initialQuotes, initialMemes, { repos, stack }, initialCommits] = await Promise.all([
    getInitialQuotes(),
    getInitialMemes(),
    getReposAndStack(),
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
