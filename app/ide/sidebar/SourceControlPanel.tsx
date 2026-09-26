import { timeAgo } from '../utils'
import { IconChevron } from '../icons'
import { ViewTitle } from './shared'
import type { Commit } from '../types'

export default function SourceControlPanel({ commits, loading }: { commits: Commit[]; loading: boolean }) {
  const latest = commits[0]
  return (
    <div className="ide-sidebar">
      <ViewTitle title="Source Control" />
      <div style={{ padding: '8px 8px 4px' }}>
        <input className="ide-search-input" placeholder="Message (Ctrl+Enter to commit)" readOnly />
      </div>
      <div className="ide-scm-sync">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M6 9v6M15 18H9"/>
        </svg>
        <span>main</span>
        <span className="ide-scm-sync-badge">↑0 ↓0</span>
      </div>

      {!loading && latest && (
        <div className="ide-section">
          <div className="ide-section-header">
            <IconChevron open={true} />
            <span style={{ flex: 1 }}>LATEST COMMIT</span>
          </div>
          <a href={latest.html_url} target="_blank" rel="noopener noreferrer" className="ide-scm-latest">
            <div className="ide-scm-latest-msg">{latest.commit.message.split('\n')[0]}</div>
            <div className="ide-scm-latest-meta">
              <span className="ide-scm-hash">{latest.sha.slice(0, 7)}</span>
              <span>{latest.commit.author.name}</span>
              <span>{timeAgo(latest.commit.author.date)}</span>
            </div>
          </a>
        </div>
      )}

      <div className="ide-section">
        <div className="ide-section-header">
          <IconChevron open={true} />
          <span style={{ flex: 1 }}>COMMITS</span>
          {!loading && <span className="ide-section-badge">{commits.length}</span>}
        </div>
        {loading && [1,2,3,4,5].map(i => (
          <div key={i} className="ide-skeleton" style={{ height: 42, margin: '4px 10px', borderRadius: 4 }} />
        ))}
        {!loading && commits.length === 0 && (
          <div className="ide-search-empty">No commits loaded</div>
        )}
        {commits.map(c => (
          <a key={c.sha} href={c.html_url} target="_blank" rel="noopener noreferrer" className="ide-scm-commit">
            <span className="ide-scm-hash">{c.sha.slice(0, 7)}</span>
            <span className="ide-scm-msg">{c.commit.message.split('\n')[0]}</span>
            <span className="ide-scm-meta">{c.commit.author.name} · {timeAgo(c.commit.author.date)}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
