import IDEApp from './IDEApp'

const LANG_COLORS = {
  TypeScript:  '#3178c6',
  JavaScript:  '#f1e05a',
  Java:        '#b07219',
  Vue:         '#41b883',
  Python:      '#3572a5',
  'C++':       '#f34b7d',
  C:           '#555555',
  'C#':        '#178600',
  CSS:         '#563d7c',
  HTML:        '#e34c26',
  Go:          '#00add8',
  Rust:        '#dea584',
  Shell:       '#89e051',
  Kotlin:      '#a97bff',
  Swift:       '#f05138',
  Ruby:        '#701516',
  PHP:         '#4f5d95',
  Dart:        '#00b4ab',
  Scala:       '#c22d40',
  Haskell:     '#5e5086',
  Lua:         '#000080',
  Nix:         '#7e7eff',
  Dockerfile:  '#384d54',
}

async function getInitialQuote() {
  try {
    const res = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.length > 0) {
      return {
        content: data[0].content.replace(/^["'"']+|["'"']+$/g, '').trim(),
        author:  data[0].author,
        tags:    (data[0].tags || '')
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
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
  } catch {
    return null
  }
}

async function getReposAndStack() {
  try {
    const res = await fetch(
      'https://api.github.com/users/tilalx/repos?sort=pushed&per_page=100',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return { repos: [], stack: [] }

    const data = await res.json()

    const repos = data.map(r => ({
      name:        r.name,
      description: r.description,
      language:    r.language,
      stars:       r.stargazers_count,
      pushed_at:   r.pushed_at,
      fork:        r.fork,
      url:         r.html_url,
    }))

    // Collect unique languages, preserving push-order priority
    const seen = new Set()
    const stack = []
    for (const r of repos) {
      if (r.language && !seen.has(r.language)) {
        seen.add(r.language)
        stack.push({
          name:  r.language,
          color: LANG_COLORS[r.language] || '#6c7086',
        })
      }
    }

    return { repos, stack }
  } catch {
    return { repos: [], stack: [] }
  }
}

export const metadata = {
  title: 'tilalx.dev',
  description: 'Personal Page',
}

export default async function HomePage() {
  const [initialQuote, initialMeme, { repos, stack }] = await Promise.all([
    getInitialQuote(),
    getInitialMeme(),
    getReposAndStack(),
  ])

  return (
    <IDEApp
      initialQuote={initialQuote}
      initialMeme={initialMeme}
      repos={repos}
      stack={stack}
    />
  )
}
