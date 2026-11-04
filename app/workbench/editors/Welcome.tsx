'use client'

import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { README_PATH } from '../paths'
import { timeAgo } from '../format'

interface Walkthrough { id: string; icon: string; title: string; description: string; run(): void }

export default function Welcome() {
  const wb = useWorkbench()
  const repos = wb.data.repos.filter(r => !r.fork).slice(0, 6)
  const quote = wb.data.quotes.find(q => q.content.length <= 160) ?? wb.data.quotes[0]

  const start = [
    { icon: 'open-preview', label: 'Read About Me...',      run: () => wb.open({ type: 'preview', path: README_PATH }) },
    { icon: 'go-to-file',   label: 'Browse This Site...',   run: () => wb.quickInput('files') },
    { icon: 'repo-clone',   label: 'Clone Git Repository...', run: () => window.open('https://github.com/tilalx/tilalx', '_blank', 'noopener') },
    { icon: 'mail',         label: 'Get in Touch...',       run: () => window.open('https://www.linkedin.com/in/tilo-alexander', '_blank', 'noopener') },
  ]

  const walkthroughs: Walkthrough[] = [
    { id: 'about',  icon: 'person',     title: 'Get to Know Tilo',      description: 'Systems & DevOps engineer from Germany: containers, pipelines and the glue in between.',
      run: () => wb.open({ type: 'preview', path: README_PATH }) },
    { id: 'stack',  icon: 'extensions', title: 'Explore My Stack',      description: 'The languages and tools I use, shown as installed extensions.', run: () => wb.showView('extensions') },
    { id: 'graph',  icon: 'graph',      title: 'Contribution Activity', description: 'A year of commits, straight from GitHub.', run: () => wb.open({ type: 'contributions' }) },
    { id: 'memes',  icon: 'file-media', title: 'Today’s Memes',         description: 'A live feed from a meme API I host myself.', run: () => wb.open({ type: 'memes' }) },
    { id: 'quotes', icon: 'quote',      title: 'Random Quotes',         description: 'Served by quotes-rest, another API of mine.', run: () => wb.open({ type: 'quotes' }) },
    { id: 'term',   icon: 'terminal',   title: 'Open a Terminal',       description: 'Poke around with ls, cat, git log and friends.', run: () => wb.showPanel('terminal') },
  ]

  return (
    <div className="welcome scrollable">
      <div className="welcome-grid">
        <div className="welcome-header">
          <h1>Tilo Alexander</h1>
          <p className="subtitle">Infrastructure all the way down</p>
        </div>
        <div className="welcome-left">
          <section className="welcome-section">
            <h2>Start</h2>
            <ul>
              {start.map(s => (
                <li key={s.label}>
                  <button className="button-link" onClick={s.run}><Codicon name={s.icon} />{s.label}</button>
                </li>
              ))}
            </ul>
          </section>
          <section className="welcome-section">
            <h2>Recent</h2>
            {repos.length === 0
              ? <p>No recent repositories, <a href="https://github.com/tilalx" target="_blank" rel="noopener noreferrer">browse GitHub</a> to start.</p>
              : (
                <ul className="recent">
                  {repos.map(r => (
                    <li key={r.name}>
                      <a className="button-link" href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a>
                      <span className="path" title={r.description ?? ''} suppressHydrationWarning>~/github/{r.name} · {timeAgo(r.pushed_at)}</span>
                    </li>
                  ))}
                  <li><a className="button-link more" href="https://github.com/tilalx?tab=repositories" target="_blank" rel="noopener noreferrer">More...</a></li>
                </ul>
              )}
          </section>
        </div>
        <div className="welcome-right">
          <section className="welcome-section">
            <h2>Walkthroughs</h2>
            {walkthroughs.map((w, i) => (
              <button key={w.id} className={`walkthrough${i === 0 ? ' featured' : ''}`} onClick={w.run}>
                {i === 0 && <span className="featured-badge"><Codicon name="star-full" /></span>}
                <span className="walkthrough-title"><Codicon name={w.icon} className="walkthrough-icon" />{w.title}</span>
                {i === 0 && <span className="walkthrough-description">{w.description}</span>}
                {i === 0 && <span className="walkthrough-progress"><span style={{ width: '33%' }} /></span>}
              </button>
            ))}
          </section>
          {quote && (
            <section className="welcome-section">
              <h2>Quote of the Visit</h2>
              <figure className="welcome-quote">
                <blockquote>&ldquo;{quote.content}&rdquo;</blockquote>
                <figcaption>— {quote.author}</figcaption>
              </figure>
              <button className="button-link" onClick={() => wb.open({ type: 'quotes' })}>More quotes...</button>
            </section>
          )}
        </div>
        <div className="welcome-footer">
          <label>
            <input
              type="checkbox"
              checked={wb.settings['workbench.startupEditor'] === 'welcomePage'}
              onChange={e => wb.setSetting('workbench.startupEditor', e.target.checked ? 'welcomePage' : 'readme')}
            />
            <span className="checkbox"><Codicon name="check" /></span>
            Show welcome page on startup
          </label>
        </div>
      </div>
    </div>
  )
}
