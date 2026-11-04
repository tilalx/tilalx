'use client'

import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { timeAgo } from '../format'

export default function Timeline({ path }: { path: string | null }) {
  const { data } = useWorkbench()
  if (!path) return <div className="pane-message">The active editor cannot provide timeline information.</div>
  if (!data.commits.length) return <div className="pane-message">No timeline information was provided.</div>
  return (
    <div className="list" role="tree" aria-label="Timeline">
      {data.commits.map(c => (
        <a key={c.sha} className="list-row" href={c.html_url} target="_blank" rel="noopener noreferrer"
           title={`${c.commit.author.name}, ${new Date(c.commit.author.date).toLocaleString()}\n\n${c.commit.message}`}>
          <span className="tree-lead file" />
          <span className="tree-label">
            <Codicon name="git-commit" style={{ marginRight: 6 }} />
            <span className="name">{c.commit.message.split('\n')[0]}</span>
            <span className="description">{timeAgo(c.commit.author.date)}</span>
          </span>
        </a>
      ))}
    </div>
  )
}
