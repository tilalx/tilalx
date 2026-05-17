import { LANG_COLORS } from './constants'
import { timeAgo } from './utils'
import { IconExternalLink } from './icons'
import ContributionGraph from './ContributionGraph'

async function fetchRepos() {
  try {
    const res = await fetch(
      'https://api.github.com/users/tilalx/repos?sort=pushed&per_page=100',
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return { repos: [], stack: [] }
    const data = await res.json()
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

async function fetchContributions() {
  const year = new Date().getFullYear()
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/tilalx?y=${year}`,
      { next: { revalidate: 3600 } }
    )
    return res.ok ? await res.json() : null
  } catch { return null }
}

function StackBadge({ name, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid #313244',
      borderRadius: 4, fontSize: 11, color: '#cdd6f4',
      fontFamily: 'JetBrains Mono, Consolas, monospace', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {name}
    </span>
  )
}

function RepoCard({ repo }) {
  const langColor = LANG_COLORS[repo.language] || '#6c7086'
  return (
    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="ide-repo-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ color: '#89b4fa', fontWeight: 600, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {repo.name}
        </span>
        {repo.fork && (
          <span style={{ fontSize: 9, color: '#6c7086', border: '1px solid #313244', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap', flexShrink: 0 }}>fork</span>
        )}
        <IconExternalLink />
      </div>
      <div style={{ color: '#6c7086', fontSize: 12, marginBottom: 10, minHeight: 16 }}>
        {repo.description || 'no description'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
        {repo.language && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#a6adc8' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: langColor, flexShrink: 0 }} />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && <span style={{ color: '#a6adc8' }}>★ {repo.stars}</span>}
        {repo.pushed_at && <span style={{ color: '#45475a', marginLeft: 'auto' }}>{timeAgo(repo.pushed_at)}</span>}
      </div>
    </a>
  )
}

export default async function ReadmeEditor() {
  const [{ repos, stack }, contributions] = await Promise.all([fetchRepos(), fetchContributions()])
  return (
    <div className="ide-editor-scroll">
      <div className="ide-line-numbers" aria-hidden="true">
        {Array.from({ length: 90 }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <div className="ide-editor-body">

        <div className="ide-profile-header">
          <img
            className="ide-profile-photo"
            src="https://github.com/tilalx.png"
            alt="Tilo Alexander"
          />
          <div>
            <div className="ide-profile-hi"># Hi, I&apos;m</div>
            <div className="ide-profile-name">Tilo Alexander</div>
            <div className="ide-profile-tagline">
              <span className="handle">@tilalx</span> · building things on the web
            </div>
          </div>
        </div>

        <div className="ide-markdown">
          <h2 id="readme-about">## about</h2>
          <p>
            Systems and DevOps engineer based in Germany. I design and operate infrastructure —
            containers, pipelines, and the glue code that holds everything together. Most of my
            day is Dockerfiles, Linux systems, Terraform and Ansible configs, and CI/CD pipelines
            rather than product features.
          </p>
          <p>
            I self-host more services than is sensible, automate anything that runs more than
            twice, and have strong opinions about log aggregation. When I do write application
            code it&apos;s usually TypeScript or Python, mostly to scratch my own itch.
          </p>
          <p>
            This page is one of those itches: a Next.js app styled like the editor I live in,
            pulling a live meme and quote from APIs I run myself. Infrastructure all the way down.
          </p>

          <h2 id="readme-stack">## stack</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {(stack?.length > 0 ? stack : ['TypeScript','JavaScript','Java','Python','Shell'].map(n => ({ name: n, color: LANG_COLORS[n] || '#6c7086' }))).map(s => (
              <StackBadge key={s.name} name={s.name} color={s.color} />
            ))}
          </div>

          <h2 id="readme-repositories">## repositories</h2>
          {repos?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 24 }}>
              {repos.map(repo => <RepoCard key={repo.name} repo={repo} />)}
            </div>
          ) : (
            <p style={{ color: '#6c7086' }}>No repositories found.</p>
          )}

          <h2 id="readme-contributions">## contributions</h2>
          <ContributionGraph username="tilalx" initialData={contributions} />

          <h2 id="readme-contact">## contact</h2>
          <pre style={{
            background: '#11111b', border: '1px solid #313244', borderRadius: 6,
            padding: '14px 16px', fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 12, lineHeight: 1.8, overflowX: 'auto', marginBottom: 24,
          }}>
            <span style={{ color: '#cba6f7' }}>const</span>
            <span style={{ color: '#cdd6f4' }}> contact </span>
            <span style={{ color: '#89dceb' }}>=</span>
            <span style={{ color: '#cdd6f4' }}> {'{'}</span>{'\n'}
            <span style={{ color: '#cdd6f4' }}>{'  '}github</span>
            <span style={{ color: '#89dceb' }}>:   </span>
            <a href="https://github.com/tilalx" target="_blank" rel="noopener noreferrer" className="ide-contact-link">
              &quot;github.com/tilalx&quot;
            </a>
            <span style={{ color: '#6c7086' }}>,</span>{'\n'}
            <span style={{ color: '#cdd6f4' }}>{'  '}linkedin</span>
            <span style={{ color: '#89dceb' }}>: </span>
            <a href="https://www.linkedin.com/in/tilo-alexander/" target="_blank" rel="noopener noreferrer" className="ide-contact-link">
              &quot;linkedin.com/in/tilo-alexander&quot;
            </a>
            <span style={{ color: '#6c7086' }}>,</span>{'\n'}
            <span style={{ color: '#cdd6f4' }}>{'}'}</span>
          </pre>
        </div>

      </div>
    </div>
  )
}
