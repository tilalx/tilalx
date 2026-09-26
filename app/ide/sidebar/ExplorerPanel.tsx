import { useState } from 'react'
import { TABS, LANG_COLORS } from '../constants'
import { timeAgo, repoStatusColor } from '../utils'
import { IconChevron, IconFork, FileIcon, IconCollapseAll } from '../icons'
import { parseSymbols, type SymbolKind } from '../symbols'
import { ViewTitle, treeKeyDown, README_OUTLINE } from './shared'
import type { FileNode, Repo, Tab, TabKind, Group } from '../types'

const SYMBOL_GLYPH: Record<SymbolKind, string> = { heading: 'H', function: 'ƒ', class: 'C', component: '⬡', const: 'v', key: '{}' }

function tabLabel(t: Tab) {
  if (t.kind === 'file') return t.file!.split('/').pop()!
  return TABS.find(x => x.id === t.kind)?.label || t.kind
}

interface FileTreeItemProps { item: FileNode; depth?: number; activeFile: string; collapsed?: boolean; onFileClick?: (path: string) => void }

function FileTreeItem({ item, depth = 0, activeFile, collapsed, onFileClick }: FileTreeItemProps) {
  const [open, setOpen] = useState(!collapsed && (item.open ?? false))
  const indent = depth * 12 + 8

  if (item.type === 'folder') {
    return (
      <>
        <div
          className="ide-file-item"
          style={{ paddingLeft: indent }}
          onClick={() => setOpen(o => !o)}
          role="treeitem" tabIndex={-1} aria-level={depth + 1} aria-expanded={open}
        >
          <IconChevron open={open} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
        </div>
        {open && (item.children || []).map(child => (
          <FileTreeItem key={child.name} item={child} depth={depth + 1} activeFile={activeFile} collapsed={collapsed} onFileClick={onFileClick} />
        ))}
      </>
    )
  }

  const itemPath = item.path || item.name
  const isActive = activeFile === itemPath
  return (
    <div
      className={`ide-file-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: indent + 16 }}
      onClick={() => onFileClick?.(itemPath)}
      role="treeitem" tabIndex={isActive ? 0 : -1} aria-level={depth + 1} aria-selected={isActive}
    >
      <FileIcon name={item.name} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</span>
      {item.modified && <span className="ide-file-mod">M</span>}
    </div>
  )
}

export interface ExplorerPanelProps {
  activeTab:      TabKind
  openFile?:      string | null
  onTabChange:    (id: TabKind) => void
  onOpenFile?:    (file: string, line?: number) => void
  repos:          Repo[]
  fileTree?:      FileNode[]
  fileContents?:  Record<string, string> | null
  editorGroups?:  Group[]
  activeGroupId?: string
  onSelectTab?:   (groupId: string, tabId: string) => void
  onCloseTab?:    (groupId: string, tabId: string) => void
}

export default function ExplorerPanel({ activeTab, openFile, onTabChange, onOpenFile, repos, fileTree = [], fileContents, editorGroups, activeGroupId, onSelectTab, onCloseTab }: ExplorerPanelProps) {
  const [sections, setSections] = useState({ openEditors: true, files: true, repos: true, outline: true })
  const toggle = (key: keyof typeof sections) => setSections(s => ({ ...s, [key]: !s[key] }))
  // Bumping this remounts the tree with every folder closed.
  const [collapseGen, setCollapseGen] = useState(0)
  const activeFile = openFile || TABS.find(t => t.id === activeTab)?.label || 'README.md'

  return (
    <div className="ide-sidebar">
      <ViewTitle title="Explorer" actions={[
        { title: 'Collapse Folders in Explorer', icon: <IconCollapseAll />, onClick: () => setCollapseGen(g => g + 1) },
      ]} />

      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('openEditors')}>
          <IconChevron open={sections.openEditors} />
          Open Editors
        </div>
        {sections.openEditors && <div role="tree" aria-label="Open Editors" onKeyDown={treeKeyDown}>{editorGroups?.length ? editorGroups.map((g, gi) => (
          <div key={g.id}>
            {editorGroups.length > 1 && <div className="ide-open-editors-group">GROUP {gi + 1}</div>}
            {g.tabs.map(t => {
              const label = tabLabel(t)
              const active = g.id === activeGroupId && t.id === g.activeTabId
              return (
                <div
                  key={t.id}
                  className={`ide-file-item ide-open-editor${active ? ' active' : ''}`}
                  style={{ paddingLeft: 20 }}
                  onClick={() => onSelectTab?.(g.id, t.id)}
                  role="treeitem" tabIndex={active ? 0 : -1} aria-selected={active}
                >
                  <FileIcon name={label} />
                  <span className={`ide-oe-label${t.preview ? ' preview' : ''}`}>{label}</span>
                  <span className="ide-oe-close" title="Close" onClick={e => { e.stopPropagation(); onCloseTab?.(g.id, t.id) }}>×</span>
                </div>
              )
            })}
          </div>
        )) : TABS.map(tab => (
          <div
            key={tab.id}
            className={`ide-file-item${activeTab === tab.id && !openFile ? ' active' : ''}`}
            style={{ paddingLeft: 20 }}
            onClick={() => onTabChange(tab.id)}
          >
            <FileIcon name={tab.label} />
            <span>{tab.label}</span>
          </div>
        ))}</div>}
      </div>

      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('files')}>
          <IconChevron open={sections.files} />
          tilalx
          <span style={{ marginLeft: 6, color: 'var(--ide-green)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>MAIN</span>
        </div>
        {sections.files && <div role="tree" aria-label="Files Explorer" onKeyDown={treeKeyDown}>
        {TABS.filter(t => t.id !== 'readme').map((tab, i) => (
          <div
            key={tab.id}
            className={`ide-file-item${activeTab === tab.id && !openFile ? ' active' : ''}`}
            style={{ paddingLeft: 24 }}
            onClick={() => onTabChange(tab.id)}
            role="treeitem" tabIndex={i === 0 || (activeTab === tab.id && !openFile) ? 0 : -1} aria-level={1}
          >
            <FileIcon name={tab.label} />
            <span>{tab.label}</span>
          </div>
        ))}
        {fileTree.map(item => (
          <FileTreeItem
            key={`${collapseGen}:${item.name}`}
            item={item}
            depth={0}
            activeFile={activeFile}
            collapsed={collapseGen > 0}
            onFileClick={filePath => {
              const tab = TABS.find(t => t.label === filePath.split('/').pop())
              if (tab) { onTabChange(tab.id); return }
              onOpenFile?.(filePath)
            }}
          />
        ))}
        </div>}
      </div>

      {repos?.length > 0 && (
        <div className="ide-section">
          <div className="ide-section-header" onClick={() => toggle('repos')}>
            <IconChevron open={sections.repos} />
            Repositories
            <span className="ide-section-badge">{repos.length}</span>
          </div>
          {sections.repos && repos.map(repo => (
            <a
              key={repo.name}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ide-repo-list-item"
              style={{ textDecoration: 'none' }}
            >
              <span className="ide-repo-list-dot" style={{ background: repoStatusColor(repo.pushed_at) }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, color: 'var(--ide-fg2)', fontSize: 12 }}>
                {repo.name}
              </span>
              {repo.fork && <IconFork />}
              <span className="ide-repo-list-stars" style={{ gap: 4 }}>
                {repo.language && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: LANG_COLORS[repo.language] || 'var(--ide-muted)', flexShrink: 0 }} />
                )}
                {repo.stars > 0 && <span>★{repo.stars}</span>}
                <span>{timeAgo(repo.pushed_at)}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('outline')}>
          <IconChevron open={sections.outline} />
          Outline
        </div>
        {sections.outline && <Outline activeTab={activeTab} openFile={openFile} fileContents={fileContents} onTabChange={onTabChange} onOpenFile={onOpenFile} />}
      </div>
    </div>
  )
}

type OutlineProps = Pick<ExplorerPanelProps, 'activeTab' | 'openFile' | 'fileContents' | 'onTabChange' | 'onOpenFile'>

function Outline({ activeTab, openFile, fileContents, onTabChange, onOpenFile }: OutlineProps) {
  if (openFile) {
    const syms = parseSymbols(openFile, fileContents?.[openFile] || '')
    if (!syms.length) return <div className="ide-search-empty">No symbols found</div>
    return syms.map((s, i) => (
      <div
        key={i}
        className="ide-outline-item"
        style={{ cursor: 'pointer', paddingLeft: 8 + ((s.level || 1) - 1) * 12 }}
        onClick={() => onOpenFile?.(openFile, s.line)}
      >
        <span className="ide-outline-kind">{SYMBOL_GLYPH[s.kind] || '•'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
      </div>
    ))
  }
  if (activeTab === 'readme') {
    return README_OUTLINE.map((item, i) => (
      <div
        key={i}
        className={`ide-outline-item ${item.level}`}
        style={{ cursor: 'pointer' }}
        onClick={() => {
          onTabChange('readme')
          if (item.anchor) {
            setTimeout(() => {
              document.getElementById(item.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 50)
          }
        }}
      >
        <span style={{ color: 'var(--ide-surface)', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{item.level.toUpperCase()}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
      </div>
    ))
  }
  return <div className="ide-search-empty">No symbols found</div>
}
