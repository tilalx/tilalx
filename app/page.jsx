import fs      from 'fs'
import path    from 'path'
import { Suspense } from 'react'
import IDEApp       from './IDEApp'
import ReadmeEditor from './ide/ReadmeEditor'
import { LANG_COLORS } from './ide/constants'
import { stripQuotes, parseTags, pickMemeUrl } from './ide/utils'

const SOURCE_FILES = [
  'README.md', 'package.json', 'next.config.js', 'Dockerfile', '.gitignore',
  'app/layout.jsx', 'app/page.jsx', 'app/globals.css', 'app/IDEApp.jsx', 'app/Track.jsx',
  'public/favicon.svg', 'public/manifest.json', 'public/robots.txt',
]

function getFileContents() {
  const out = {}
  SOURCE_FILES.forEach(f => {
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

  return (
    <main style={{ display: 'contents' }}>
      <IDEApp
        initialQuotes={initialQuotes}
        initialMemes={initialMemes}
        initialCommits={initialCommits}
        repos={repos}
        stack={stack}
        fileContents={getFileContents()}
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
