'use client'

import { useState } from 'react'
import { pressable } from '../pressable'
import { Codicon, FileIcon } from '../icons'
import { useWorkbench, useIsMac } from '../context'
import { basename } from '../languages'
import { timeAgo } from '../format'
import { keyLabel } from '../keybinding'
import { Pane, ViewTitle } from './Pane'
import type { GitStatus } from '../types'

const STATUS_LABEL: Record<GitStatus, string> = { M: 'Modified', U: 'Untracked', A: 'Index Added', D: 'Deleted' }

export default function SourceControl() {
  const wb  = useWorkbench()
  const mac = useIsMac()
  const [message, setMessage] = useState('')
  const [panes, setPanes] = useState({ changes: true, graph: true })
  const changes = Object.entries(wb.data.git).sort(([a], [b]) => a.localeCompare(b))
  const light = wb.theme.type === 'light'
  const commit = () => wb.notify('This is a personal page: commits happen on GitHub.')

  return (
    <>
      <ViewTitle title="Source Control" actions={[
        { icon: 'check', title: 'Commit', run: commit },
        { icon: 'refresh', title: 'Refresh', run: () => location.reload() },
        { icon: 'ellipsis', title: 'More Actions...', run: () => window.open('https://github.com/tilalx/tilalx', '_blank', 'noopener') },
      ]} />
      <div className="sidebar-content">
        <Pane title="Changes" expanded={panes.changes} onToggle={() => setPanes(p => ({ ...p, changes: !p.changes }))}>
          <div className="scm-input">
            <div className="monaco-inputbox">
              <textarea
                rows={1}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (mac ? e.metaKey : e.ctrlKey)) { e.preventDefault(); commit() } }}
                placeholder={`Message (${keyLabel('Cmd+Enter', mac)} to commit on "${wb.data.branch}")`}
                aria-label="Source Control Input"
              />
            </div>
            <button className="monaco-button scm-commit" onClick={commit}>
              <Codicon name="check" /> Commit
            </button>
          </div>
          <div className="list" role="tree">
            <div className="list-row scm-group">
              <span className="tree-lead folder"><Codicon name="chevron-down" /></span>
              <span className="tree-label"><span className="name">Changes</span><span className="badge">{changes.length}</span></span>
            </div>
            {changes.map(([path, status]) => (
              <div
                key={path}
                className="list-row"
                style={{ paddingLeft: 12 }}
                title={`${path} • ${STATUS_LABEL[status]}`}
                {...pressable(() => { if (status !== 'D') wb.open({ type: 'file', path }, { preview: true }) }, 'treeitem')}
              >
                <span className="tree-lead file" />
                <span className={`tree-label git-${status}`}>
                  <FileIcon path={path} light={light} />
                  <span className="name">{basename(path)}</span>
                  <span className="description">{path.split('/').slice(0, -1).join('/')}</span>
                  <span className="deco">{status}</span>
                </span>
              </div>
            ))}
          </div>
        </Pane>
        <Pane title="Graph" expanded={panes.graph} onToggle={() => setPanes(p => ({ ...p, graph: !p.graph }))}>
          <div className="list scm-graph" role="tree">
            {wb.data.commits.length === 0 && <div className="pane-message">No commits could be loaded from GitHub.</div>}
            {wb.data.commits.map((c, i) => (
              <a
                key={c.sha}
                className="list-row"
                href={c.html_url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${c.commit.author.name}, ${timeAgo(c.commit.author.date)} ago\n\n${c.commit.message}`}
              >
                <span className="graph-lane">
                  <span className={`graph-line${i === 0 ? ' first' : ''}${i === wb.data.commits.length - 1 ? ' last' : ''}`} />
                  <span className="graph-dot" />
                </span>
                <span className="tree-label">
                  <span className="name">{c.commit.message.split('\n')[0]}</span>
                  <span className="description">{c.commit.author.name}</span>
                  {i === 0 && <span className="scm-ref"><Codicon name="target" /> {wb.data.branch}</span>}
                </span>
              </a>
            ))}
          </div>
        </Pane>
      </div>
    </>
  )
}
