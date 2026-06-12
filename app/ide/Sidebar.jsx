'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { TABS, LANG_COLORS } from './constants'
import { timeAgo, repoStatusColor, getFileColor } from './utils'
import { IconChevron, IconFork, FileItemIcon, IconSettings } from './icons'
import { SettingsSidebarHint } from './SettingsUI'
import { parseSymbols } from './symbols'

// Tab → { label, color, settings } for the Open Editors list.
function tabMetaSidebar(t) {
  if (t.kind === 'file')     return { label: t.file.split('/').pop(), color: getFileColor(t.file) }
  if (t.kind === 'settings') return { label: 'settings.json', settings: true }
  const meta = TABS.find(x => x.id === t.kind)
  return { label: meta?.label || t.kind, color: meta?.color }
}

const SYMBOL_GLYPH = { heading: 'H', function: 'ƒ', class: 'C', component: '⬡', const: 'v', key: '{}' }

const OUTLINE = [
  { level: 'h1', text: "Hi, I'm Tilo Alexander", anchor: null        },
  { level: 'h2', text: '## about',               anchor: 'readme-about'          },
  { level: 'h2', text: '## stack',               anchor: 'readme-stack'          },
  { level: 'h2', text: '## repositories',        anchor: 'readme-repositories'   },
  { level: 'h2', text: '## contributions',       anchor: 'readme-contributions'  },
  { level: 'h2', text: '## contact',             anchor: 'readme-contact'        },
]

const EXTENSIONS_BASE = [
  { category: 'Languages',               name: 'TypeScript',  desc: 'TypeScript language support',    version: '5.4.2',  enabled: true  },
  { category: 'Languages',               name: 'JavaScript',  desc: 'JavaScript language features',   version: '1.91.0', enabled: true  },
  { category: 'Languages',               name: 'Python',      desc: 'Python IntelliSense',            version: '2024.4', enabled: true  },
  { category: 'Languages',               name: 'Java',        desc: 'Java language support',          version: '1.28.0', enabled: true  },
  { category: 'Languages',               name: 'Shell',       desc: 'ShellScript language support',   version: '0.9.0',  enabled: true  },
  { category: 'Languages',               name: 'Nix',         desc: 'Nix expression language',        version: '0.7.0',  enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'Next.js',     desc: 'Next.js snippets & tools',       version: '0.0.12', enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'React',       desc: 'React snippets & IntelliSense',  version: '0.3.1',  enabled: true  },
  { category: 'Frameworks & Runtimes',   name: 'Node.js',     desc: 'Node.js runtime support',        version: '22.0.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Docker',      desc: 'Dockerfile language features',   version: '1.29.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Terraform',   desc: 'HashiCorp Terraform',            version: '2.31.0', enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Ansible',     desc: 'Ansible automation support',     version: '1.2.3',  enabled: true  },
  { category: 'DevOps & Infrastructure', name: 'Kubernetes',  desc: 'Kubernetes YAML schemas',        version: '1.3.11', enabled: false },
]

function FileTreeItem({ item, depth = 0, activeFile, onFileClick }) {
  const [open, setOpen] = useState(item.open ?? false)
  const indent = depth * 12 + 8

  if (item.type === 'folder') {
    return (
      <>
        <div className="ide-file-item" style={{ paddingLeft: indent }} onClick={() => setOpen(o => !o)}>
          <IconChevron open={open} />
          <FileItemIcon item={item} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
        </div>
        {open && (item.children || []).map(child => (
          <FileTreeItem key={child.name} item={child} depth={depth + 1} activeFile={activeFile} onFileClick={onFileClick} />
        ))}
      </>
    )
  }

  const itemPath = item.path || item.name
  const isActive = activeFile === itemPath
  return (
    <div
      className={`ide-file-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: indent }}
      onClick={() => onFileClick?.(itemPath)}
    >
      <FileItemIcon item={item} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</span>
      {item.modified && <span className="ide-file-mod">M</span>}
    </div>
  )
}

function SearchHighlight({ text, query }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span className="ide-search-label">{text}</span>
  return (
    <span className="ide-search-label">
      {text.slice(0, idx)}
      <mark className="ide-search-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

function ExplorerPanel({ activeTab, openFile, onTabChange, onOpenFile, repos, fileTree = [], fileContents, editorGroups, activeGroupId, onSelectTab, onCloseTab }) {
  const [sections, setSections] = useState({ openEditors: true, files: true, repos: true, outline: true })
  const toggle = key => setSections(s => ({ ...s, [key]: !s[key] }))
  const activeFile = openFile || TABS.find(t => t.id === activeTab)?.label || 'README.md'

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Explorer</div>

      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('openEditors')}>
          <IconChevron open={sections.openEditors} />
          Open Editors
        </div>
        {sections.openEditors && (editorGroups?.length ? editorGroups.map((g, gi) => (
          <div key={g.id}>
            {editorGroups.length > 1 && <div className="ide-open-editors-group">GROUP {gi + 1}</div>}
            {g.tabs.map(t => {
              const meta = tabMetaSidebar(t)
              const active = g.id === activeGroupId && t.id === g.activeTabId
              return (
                <div
                  key={t.id}
                  className={`ide-file-item ide-open-editor${active ? ' active' : ''}`}
                  style={{ paddingLeft: 20 }}
                  onClick={() => onSelectTab?.(g.id, t.id)}
                >
                  {meta.settings
                    ? <span className="ide-oe-ico"><IconSettings /></span>
                    : <span className="ide-file-dot" style={{ background: meta.color }} />}
                  <span className={`ide-oe-label${t.preview ? ' preview' : ''}`}>{meta.label}</span>
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
            <span className="ide-file-dot" style={{ background: tab.color }} />
            <span>{tab.label}</span>
          </div>
        )))}
      </div>

      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('files')}>
          <IconChevron open={sections.files} />
          tilalx
          <span style={{ marginLeft: 6, color: '#a6e3a1', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>MAIN</span>
        </div>
        {sections.files && fileTree.map(item => (
          <FileTreeItem
            key={item.name}
            item={item}
            depth={0}
            activeFile={activeFile}
            onFileClick={filePath => {
              const tab = TABS.find(t => t.label === filePath.split('/').pop())
              if (tab) { onTabChange(tab.id); return }
              onOpenFile?.(filePath)
            }}
          />
        ))}
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, color: '#a6adc8', fontSize: 12 }}>
                {repo.name}
              </span>
              {repo.fork && <IconFork />}
              <span className="ide-repo-list-stars" style={{ gap: 4 }}>
                {repo.language && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: LANG_COLORS[repo.language] || '#6c7086', flexShrink: 0 }} />
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
        {sections.outline && (() => {
          // File editor: live symbols. README: its markdown anchors. Else: empty.
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
            return OUTLINE.map((item, i) => (
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
                <span style={{ color: '#45475a', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{item.level.toUpperCase()}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
              </div>
            ))
          }
          return <div className="ide-search-empty">No symbols found</div>
        })()}
      </div>
    </div>
  )
}

function SearchPanel({ repos, stack, onTabChange, fileContents, onOpenFile }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const hits = []

    OUTLINE.forEach(o => {
      if (o.text.toLowerCase().includes(q))
        hits.push({ group: 'README.md', label: o.text, preview: o.level, action: () => onTabChange('readme') })
    })

    repos?.forEach(r => {
      if (`${r.name} ${r.description || ''}`.toLowerCase().includes(q))
        hits.push({ group: 'repos', label: r.name, preview: r.description || 'no description', action: () => onTabChange('readme') })
    })

    stack?.forEach(s => {
      if (s.name.toLowerCase().includes(q))
        hits.push({ group: 'stack', label: s.name, preview: 'language / tool', action: () => onTabChange('readme') })
    })

    ;[
      { label: 'github.com/tilalx',             preview: 'contact → github'   },
      { label: 'linkedin.com/in/tilo-alexander',  preview: 'contact → linkedin' },
    ].forEach(c => {
      if (c.label.toLowerCase().includes(q))
        hits.push({ group: 'contact', label: c.label, preview: c.preview, action: () => onTabChange('readme') })
    })

    if (fileContents) {
      let total = 0
      Object.entries(fileContents).forEach(([filepath, content]) => {
        if (total >= 60) return
        let fileCount = 0
        content.split('\n').forEach((line, idx) => {
          if (fileCount >= 5 || total >= 60) return
          if (line.toLowerCase().includes(q)) {
            fileCount++
            total++
            hits.push({
              group: filepath,
              label: line.trim() || '(empty line)',
              preview: `Line ${idx + 1}`,
              action: () => onOpenFile?.(filepath, idx + 1),
            })
          }
        })
      })
    }

    return hits
  }, [query, repos, stack, onTabChange, fileContents, onOpenFile])

  const grouped = useMemo(() => results.reduce((acc, item) => {
    ;(acc[item.group] = acc[item.group] || []).push(item)
    return acc
  }, {}), [results])

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Search</div>
      <div style={{ padding: '8px 8px 4px' }}>
        <input
          ref={inputRef}
          className="ide-search-input"
          placeholder="Search files"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {query.trim() && results.length === 0 && (
        <div className="ide-search-empty">No results for &quot;{query}&quot;</div>
      )}
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="ide-section">
          <div className="ide-section-header">
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{group}</span>
            <span className="ide-section-badge">{items.length}</span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="ide-search-result" onClick={item.action}>
              <SearchHighlight text={item.label} query={query} />
              <span className="ide-search-preview">{item.preview}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function SourceControlPanel({ commits, loading }) {
  const latest = commits[0]
  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Source Control</div>
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

function ExtensionsPanel({ repos, stack }) {
  const [extQuery, setExtQuery] = useState('')
  const [toggles, setToggles] = useState(() => {
    const m = {}
    EXTENSIONS_BASE.forEach(e => { m[e.name] = e.enabled })
    return m
  })

  const allExtensions = useMemo(() => {
    const names = new Set(EXTENSIONS_BASE.map(e => e.name))
    const fromStack = (stack || [])
      .filter(s => !names.has(s.name))
      .map(s => ({ category: 'Languages', name: s.name, desc: `${s.name} language support`, version: '—', enabled: true }))
    return [...EXTENSIONS_BASE, ...fromStack]
  }, [stack])

  const filtered = useMemo(() => {
    if (!extQuery.trim()) return allExtensions
    const q = extQuery.toLowerCase()
    return allExtensions.filter(e => e.name.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q))
  }, [allExtensions, extQuery])

  const categories = useMemo(() => [...new Set(filtered.map(e => e.category))], [filtered])

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Extensions</div>
      <div style={{ padding: '8px 8px 4px' }}>
        <input
          className="ide-search-input"
          placeholder="Search Extensions"
          value={extQuery}
          onChange={e => setExtQuery(e.target.value)}
        />
      </div>
      {categories.map(cat => (
        <div key={cat} className="ide-section">
          <div className="ide-section-header">
            <IconChevron open={true} />
            <span style={{ flex: 1 }}>{cat.toUpperCase()}</span>
            <span className="ide-section-badge">{filtered.filter(e => e.category === cat).length}</span>
          </div>
          {filtered.filter(e => e.category === cat).map(ext => (
            <div key={ext.name} className="ide-ext-item">
              <span className="ide-ext-icon" style={{ background: LANG_COLORS[ext.name] || '#45475a' }} />
              <div className="ide-ext-info">
                <div className="ide-ext-name">{ext.name}</div>
                <div className="ide-ext-desc">{ext.desc}</div>
              </div>
              <div className="ide-ext-right">
                <span className="ide-ext-ver">{ext.version}</span>
                <button
                  className={`ide-ext-toggle${toggles[ext.name] !== false ? ' on' : ''}`}
                  onClick={() => setToggles(t => ({ ...t, [ext.name]: !t[ext.name] }))}
                  title={toggles[ext.name] !== false ? 'Disable' : 'Enable'}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Sidebar({ activityView, activeTab, openFile, onTabChange, onOpenFile, repos, fileTree, stack, commits, commitsLoading, settings, fileContents, editorGroups, activeGroupId, onSelectTab, onCloseTab }) {
  if (activityView === 'search')     return <SearchPanel repos={repos} stack={stack} onTabChange={onTabChange} fileContents={fileContents} onOpenFile={onOpenFile} />
  if (activityView === 'git')        return <SourceControlPanel commits={commits} loading={commitsLoading} />
  if (activityView === 'extensions') return <ExtensionsPanel repos={repos} stack={stack} />
  if (activityView === 'settings')   return <SettingsSidebarHint settings={settings} />
  return (
    <ExplorerPanel
      activeTab={activeTab} openFile={openFile} onTabChange={onTabChange} onOpenFile={onOpenFile}
      repos={repos} fileTree={fileTree} fileContents={fileContents}
      editorGroups={editorGroups} activeGroupId={activeGroupId} onSelectTab={onSelectTab} onCloseTab={onCloseTab}
    />
  )
}
