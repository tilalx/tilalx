import TabApp from './TabApp'

async function getReadme() {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/tilalx/tilalx/main/ReadMe.md',
      { next: { revalidate: 3600 } }
    )
    return res.ok ? res.text() : ''
  } catch {
    return ''
  }
}

async function getInitialQuote() {
  try {
    const res = await fetch('https://quotes.aelx.de/random?count=1', {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.length > 0) {
      return {
        content: data[0].content.replace(/^["'"']+|["'"']+$/g, '').trim(),
        author: data[0].author,
        tags: (data[0].tags || '')
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }
    }
  } catch {}
  return null
}

async function getInitialMeme() {
  try {
    const res = await fetch('https://meme-api.aelx.de/gimme', {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

export const metadata = {
  title: 'tilalx',
  description: 'Personal Page',
}

export default async function HomePage() {
  const [markdown, initialQuote, initialMeme] = await Promise.all([
    getReadme(),
    getInitialQuote(),
    getInitialMeme(),
  ])
  return (
    <TabApp
      markdown={markdown}
      initialQuote={initialQuote}
      initialMeme={initialMeme}
    />
  )
}
