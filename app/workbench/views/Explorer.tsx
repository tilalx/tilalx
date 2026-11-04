'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { pressable } from '../pressable'
import { Codicon, FileIcon } from '../icons'
import { useWorkbench } from '../context'
import { activeTabOf } from '../editors/model'
import { languageOf } from '../languages'
import type { MenuItem } from '../parts/ContextMenu'
import type { FileNode, GitStatus } from '../types'
import { Pane, ViewTitle } from './Pane'
import Outline from './Outline'
import Timeline from './Timeline'

interface Row { node: FileNode; depth: number }

const FEEDS: { type: 'memes' | 'quotes' | 'contributions'; name: string; icon: string; description: string }[] = [
  { type: 'memes',         name: 'memes.feed',          icon: 'file-media', description: 'fresh memes' },
  { type: 'quotes',        name: 'quotes.log',          icon: 'quote',      description: 'random quotes' },
  { type: 'contributions', name: 'contributions.graph', icon: 'graph',      description: 'GitHub activity' },
]

const GIT_TITLES: Record<GitStatus, string> = { M: 'Modified', U: 'Untracked', A: 'Index Added', D: 'Deleted' }
const GIT_RANK: GitStatus[] = ['D', 'M', 'A', 'U']

export function fileStatus(git: Record<string, GitStatus>, path: string): GitStatus | undefined {
  return git[path] ?? ancestors(path).map(a => git[a]).find(s => s === 'U')
}

function ancestors(path: string): string[] {
  const parts = path.split('/')
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))
}

export default function Explorer() {
  const wb = useWorkbench()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [focused, setFocused]   = useState<string | null>(null)
  const [panes, setPanes]       = useState({ folder: true, feeds: true, outline: false, timeline: false })
  const listRef = useRef<HTMLDivElement>(null)

  const tab = activeTabOf(wb.editors)
  const activePath = tab && (tab.input.type === 'file' || tab.input.type === 'preview') ? tab.input.path : null

  useEffect(() => {
    if (!activePath) return
    setExpanded(prev => {
      const need = ancestors(activePath).filter(a => !prev.has(a))
      return need.length ? new Set([...prev, ...need]) : prev
    })
    setFocused(activePath)
  }, [activePath])

  const rows = useMemo(() => {
    const out: Row[] = []
    const walk = (nodes: FileNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ node, depth })
        if (node.type === 'folder' && expanded.has(node.path)) walk(node.children ?? [], depth + 1)
      }
    }
    walk(wb.data.tree, 0)
    return out
  }, [wb.data.tree, expanded])

  const folderStatus = useMemo(() => {
    const out: Record<string, GitStatus> = {}
    for (const [file, status] of Object.entries(wb.data.git)) {
      for (const a of ancestors(file)) {
        if (!out[a] || GIT_RANK.indexOf(status) < GIT_RANK.indexOf(out[a])) out[a] = status
      }
    }
    return out
  }, [wb.data.git])

  const toggle = (path: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(path)) next.delete(path); else next.add(path)
    return next
  })

  const activate = (node: FileNode, pin: boolean) => {
    setFocused(node.path)
    if (node.type === 'folder') toggle(node.path)
    else wb.open({ type: 'file', path: node.path }, { preview: !pin, preserveFocus: !pin })
  }

  const showRowMenu = (e: React.MouseEvent, node: FileNode) => {
    const copy = (text: string) => navigator.clipboard?.writeText(text)
    const github = `https://github.com/tilalx/tilalx/${node.type === 'folder' ? 'tree' : 'blob'}/main/${node.path}`
    const fileItems: MenuItem[] = node.type === 'file' ? [
      { label: 'Open', run: () => wb.open({ type: 'file', path: node.path }) },
      { label: 'Open to the Side', run: () => wb.open({ type: 'file', path: node.path }, { group: 'side' }) },
      ...(languageOf(node.path).id === 'markdown' ? [{ label: 'Open Preview', run: () => wb.open({ type: 'preview', path: node.path }) }] : []),
      { separator: true },
    ] : [
      { label: expanded.has(node.path) ? 'Collapse' : 'Expand', run: () => toggle(node.path) },
      { separator: true },
    ]
    wb.showMenu({ x: e.clientX, y: e.clientY, items: [
      ...fileItems,
      { label: 'Copy Path', run: () => copy(`/tilalx/${node.path}`) },
      { label: 'Copy Relative Path', run: () => copy(node.path) },
      { separator: true },
      { label: 'Open on GitHub', run: () => window.open(github, '_blank', 'noopener') },
      { label: 'Find in Folder...', disabled: node.type === 'file', run: () => wb.showView('search') },
    ] })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = rows.findIndex(r => r.node.path === focused)
    const row = rows[idx]
    const move = (i: number) => { const r = rows[Math.max(0, Math.min(rows.length - 1, i))]; if (r) setFocused(r.node.path) }
    switch (e.key) {
      case 'ArrowDown': move(idx + 1); break
      case 'ArrowUp':   move(idx - 1); break
      case 'Home':      move(0); break
      case 'End':       move(rows.length - 1); break
      case 'ArrowRight':
        if (row?.node.type === 'folder') { if (!expanded.has(row.node.path)) toggle(row.node.path); else move(idx + 1) }
        break
      case 'ArrowLeft':
        if (row?.node.type === 'folder' && expanded.has(row.node.path)) toggle(row.node.path)
        else if (row) { const parent = ancestors(row.node.path).pop(); if (parent) setFocused(parent) }
        break
      case 'Enter': case ' ':
        if (row) activate(row.node, e.key === 'Enter')
        break
      default: return
    }
    e.preventDefault()
  }

  useEffect(() => {
    listRef.current?.querySelector('.list-row.focused')?.scrollIntoView({ block: 'nearest' })
  }, [focused])

  const focusedParent = focused ? (rows.find(r => r.node.path === focused)?.node.type === 'folder' && expanded.has(focused) ? focused : ancestors(focused).pop()) : undefined

  return (
    <>
      <ViewTitle title="Explorer" actions={[{ icon: 'ellipsis', title: 'Views and More Actions...', run: () => wb.quickInput('commands', '>View: ') }]} />
      <div className="sidebar-content">
        <Pane
          title="tilalx"
          expanded={panes.folder}
          onToggle={() => setPanes(p => ({ ...p, folder: !p.folder }))}
          actions={[
            { icon: 'new-file',     title: 'New File...',     run: () => wb.notify('This workspace is read-only.') },
            { icon: 'new-folder',   title: 'New Folder...',   run: () => wb.notify('This workspace is read-only.') },
            { icon: 'refresh',      title: 'Refresh Explorer', run: () => location.reload() },
            { icon: 'collapse-all', title: 'Collapse Folders in Explorer', run: () => setExpanded(new Set()) },
          ]}
        >
          <div className="list" role="tree" aria-label="Files Explorer" tabIndex={0} ref={listRef} onKeyDown={onKeyDown}
               onFocus={() => { if (!focused && rows[0]) setFocused(rows[0].node.path) }}>
            {rows.map(({ node, depth }) => {
              const isFolder = node.type === 'folder'
              const open     = isFolder && expanded.has(node.path)
              const status   = isFolder ? folderStatus[node.path] : fileStatus(wb.data.git, node.path)
              return (
                <div
                  key={node.path}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-expanded={isFolder ? open : undefined}
                  aria-selected={node.path === activePath}
                  className={`list-row${node.path === activePath ? ' selected' : ''}${node.path === focused ? ' focused' : ''}`}
                  style={{ paddingLeft: 4 + depth * 8 }}
                  title={`${node.path}${status ? ` • ${GIT_TITLES[status]}` : ''}`}
                  onClick={() => activate(node, false)}
                  onDoubleClick={() => !isFolder && activate(node, true)}
                  onContextMenu={e => { e.preventDefault(); setFocused(node.path); showRowMenu(e, node) }}
                >
                  {Array.from({ length: depth }, (_, i) => (
                    <span
                      key={i}
                      className={`indent-guide${focusedParent && ancestors(node.path)[i] === focusedParent ? ' active' : ''}`}
                      style={{ left: 20 + i * 8 }}
                    />
                  ))}
                  <span className={`tree-lead ${isFolder ? 'folder' : 'file'}`}>
                    {isFolder && <Codicon name={open ? 'chevron-down' : 'chevron-right'} />}
                  </span>
                  <span className={`tree-label${isFolder ? ' folder-label' : ''}${status ? ` git-${status}` : ''}`}>
                    {!isFolder && <FileIcon path={node.path} light={wb.theme.type === 'light'} />}
                    <span className="name">{node.name}</span>
                    {status && (isFolder ? <span className="deco dot">●</span> : <span className="deco">{status}</span>)}
                  </span>
                </div>
              )
            })}
          </div>
        </Pane>
        <Pane title="Feeds" grow={false} expanded={panes.feeds} onToggle={() => setPanes(p => ({ ...p, feeds: !p.feeds }))}>
          <div className="list" role="tree" aria-label="Feeds">
            {FEEDS.map(f => (
              <div
                key={f.type}
                className={`list-row${tab?.input.type === f.type ? ' selected' : ''}`}
                title={f.description}
                {...pressable(() => wb.open({ type: f.type }, { preview: true, preserveFocus: true }), 'treeitem')}
                onDoubleClick={() => wb.open({ type: f.type })}
              >
                <span className="tree-lead file" />
                <span className="tree-label">
                  <Codicon name={f.icon} className="feed-icon" />
                  <span className="name">{f.name}</span>
                  <span className="description">{f.description}</span>
                </span>
              </div>
            ))}
          </div>
        </Pane>
        <Pane title="Outline" grow={false} expanded={panes.outline} onToggle={() => setPanes(p => ({ ...p, outline: !p.outline }))}>
          <Outline />
        </Pane>
        <Pane title="Timeline" grow={false} expanded={panes.timeline} onToggle={() => setPanes(p => ({ ...p, timeline: !p.timeline }))}>
          <Timeline path={activePath} />
        </Pane>
      </div>
    </>
  )
}
