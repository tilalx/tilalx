import fs      from 'fs'
import path    from 'path'
import { Suspense } from 'react'
import IDEApp       from './IDEApp'
import ReadmeEditor from './ide/ReadmeEditor'
import { LANG_COLORS } from './ide/constants'

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

async function getInitialQuote() {
  try {
    const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.length > 0) {
      return {
        content: data[0].content.replace(/^["'"']+|["'"']+$/g, '').trim(),
        author:  data[0].author,
        tags:    (data[0].tags || '').replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean),
      }
    }
  } catch {}
  return null
}

async function getInitialMeme() {
  try {
    const res = await fetch('https://meme-api.aelx.de/gimme', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch { return null }
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
  const [initialQuote, initialMeme, { repos, stack }] = await Promise.all([
    getInitialQuote(),
    getInitialMeme(),
    getReposAndStack(),
  ])

  return (
    <main style={{ display: 'contents' }}>
      <IDEApp
        initialQuote={initialQuote}
        initialMeme={initialMeme}
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
