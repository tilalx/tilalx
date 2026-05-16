'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================
// STATIC DATA
// ============================================================

const TABS = [
  { id: 'readme', label: 'README.md',   color: '#519aba' },
  { id: 'memes',  label: 'memes.feed',  color: '#fab387' },
  { id: 'quotes', label: 'quotes.log',  color: '#f9e2af' },
]

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
  Nix:         '#7e7eff',
}

const FILE_TREE = [
  { name: 'README.md',      ext: 'md',   color: '#519aba', modified: true },
  { name: 'package.json',   ext: 'json', color: '#cbcb41' },
  { name: 'next.config.js', ext: 'js',   color: '#cbcb41' },
  { name: 'Dockerfile',     ext: 'dock', color: '#2496ed' },
  { name: '.gitignore',     ext: 'git',  color: '#f1502f' },
  {
    name: 'app', type: 'folder', color: '#dcb67a', open: true,
    children: [
      { name: 'layout.jsx',  ext: 'jsx', color: '#519aba' },
      { name: 'page.jsx',    ext: 'jsx', color: '#519aba', modified: true },
      { name: 'globals.css', ext: 'css', color: '#6196cc' },
      { name: 'IDEApp.jsx',  ext: 'jsx', color: '#519aba', modified: true },
      { name: 'Track.jsx',   ext: 'jsx', color: '#519aba' },
    ],
  },
  { name: 'public', type: 'folder', color: '#dcb67a', children: [] },
]

const OUTLINE = [
  { level: 'h1', text: "Hi, I'm Tilo Alexander" },
  { level: 'h2', text: '## about'               },
  { level: 'h2', text: '## stack'               },
  { level: 'h2', text: '## featured'            },
  { level: 'h2', text: '## contact'             },
]

// ============================================================
// HELPERS
// ============================================================

function stripQuotes(text) {
  return text ? text.replace(/^["'"']+|["'"']+$/g, '').trim() : ''
}

function parseTags(raw) {
  if (!raw) return []
  return raw.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean)
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const h = (Date.now() - new Date(dateStr).getTime()) / 3600000
  if (h < 1)   return 'just now'
  if (h < 24)  return `${Math.floor(h)}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function repoStatusColor(pushedAt) {
  if (!pushedAt) return '#45475a'
  const h = (Date.now() - new Date(pushedAt).getTime()) / 3600000
  if (h < 24 * 7)  return '#a6e3a1'
  if (h < 24 * 60) return '#f9e2af'
  return '#f38ba8'
}

// ============================================================
// ICONS
// ============================================================

const IconFiles = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const IconGit = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
    <path d="M6 9v6M15 18H9"/>
  </svg>
)
const IconExtensions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="7" width="7" height="7"/><rect x="15" y="7" width="7" height="7"/>
    <rect x="2" y="15" width="7" height="7"/><path d="M9 10.5h6M12 7.5v6"/>
  </svg>
)
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)
const IconChevron = ({ open }) => (
  <svg
    width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', flexShrink: 0 }}
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)

// ============================================================
// FILE ICON
// ============================================================

function FileItemIcon({ item }) {
  if (item.type === 'folder') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill={item.color || '#dcb67a'} style={{ flexShrink: 0 }}>
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={item.color || '#6c7086'} style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8" stroke={item.color || '#6c7086'} strokeWidth="2" fill="none"/>
    </svg>
  )
}

// ============================================================
// ACTIVITY BAR
// ============================================================

function ActivityBar({ active, onSelect }) {
  const buttons = [
    { id: 'explorer',   Icon: IconFiles      },
    { id: 'search',     Icon: IconSearch     },
    { id: 'git',        Icon: IconGit        },
    { id: 'extensions', Icon: IconExtensions },
  ]
  return (
    <div className="ide-activity-bar">
      {buttons.map(({ id, Icon }) => (
        <button
          key={id}
          className={`ide-act-btn${active === id ? ' active' : ''}`}
          onClick={() => onSelect(id)}
          title={id}
        >
          <Icon />
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button className="ide-act-btn" style={{ marginBottom: 4 }} title="settings">
        <IconSettings />
      </button>
    </div>
  )
}

// ============================================================
// FILE TREE
// ============================================================

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

  const isActive = activeFile === item.name
  return (
    <div
      className={`ide-file-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: indent }}
      onClick={() => onFileClick?.(item.name)}
    >
      <FileItemIcon item={item} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.name}</span>
      {item.modified && <span className="ide-file-mod">M</span>}
    </div>
  )
}

// ============================================================
// SIDEBAR
// ============================================================

const IconFork = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}>
    <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
    <path d="M6 9v2a3 3 0 003 3h6a3 3 0 003-3V9"/>
    <line x1="12" y1="12" x2="12" y2="15"/>
  </svg>
)

function Sidebar({ activeTab, onTabChange, repos }) {
  const [sections, setSections] = useState({ openEditors: true, files: true, repos: true, outline: true })
  const toggle = key => setSections(s => ({ ...s, [key]: !s[key] }))
  const activeFile = TABS.find(t => t.id === activeTab)?.label || 'README.md'

  return (
    <div className="ide-sidebar">
      <div className="ide-sidebar-title">Explorer</div>

      {/* OPEN EDITORS */}
      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('openEditors')}>
          <IconChevron open={sections.openEditors} />
          Open Editors
        </div>
        {sections.openEditors && TABS.map(tab => (
          <div
            key={tab.id}
            className={`ide-file-item${activeTab === tab.id ? ' active' : ''}`}
            style={{ paddingLeft: 20 }}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="ide-file-dot" style={{ background: tab.color }} />
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* FILE TREE */}
      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('files')}>
          <IconChevron open={sections.files} />
          tilalx.dev
          <span style={{ marginLeft: 6, color: '#a6e3a1', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>MAIN</span>
        </div>
        {sections.files && FILE_TREE.map(item => (
          <FileTreeItem
            key={item.name}
            item={item}
            depth={0}
            activeFile={activeFile}
            onFileClick={name => {
              const tab = TABS.find(t => t.label === name)
              if (tab) onTabChange(tab.id)
            }}
          />
        ))}
      </div>

      {/* REPOSITORIES */}
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
              <span
                className="ide-repo-list-dot"
                style={{ background: repoStatusColor(repo.pushed_at) }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, color: '#a6adc8', fontSize: 12 }}>
                {repo.name}
              </span>
              {repo.fork && <IconFork />}
              <span className="ide-repo-list-stars" style={{ gap: 4 }}>
                {repo.language && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: LANG_COLORS[repo.language] || '#6c7086',
                    flexShrink: 0,
                  }} />
                )}
                {repo.stars > 0 && <span>★{repo.stars}</span>}
                <span>{timeAgo(repo.pushed_at)}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {/* OUTLINE */}
      <div className="ide-section">
        <div className="ide-section-header" onClick={() => toggle('outline')}>
          <IconChevron open={sections.outline} />
          Outline
        </div>
        {sections.outline && OUTLINE.map((item, i) => (
          <div key={i} className={`ide-outline-item ${item.level}`}>
            <span style={{ color: '#45475a', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{item.level.toUpperCase()}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// LINE NUMBERS
// ============================================================

function LineNumbers({ count }) {
  return (
    <div className="ide-line-numbers">
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  )
}

// ============================================================
// README EDITOR  — hand-written content
// ============================================================

function StackBadge({ name, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid #313244',
      borderRadius: 4,
      fontSize: 11,
      color: '#cdd6f4',
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {name}
    </span>
  )
}

function RepoCard({ repo }) {
  const langColor = LANG_COLORS[repo.language] || '#6c7086'
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '12px 14px',
        background: '#181825',
        border: '1px solid #313244',
        borderRadius: 8,
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#585b70'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#313244'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ color: '#89b4fa', fontWeight: 600, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {repo.name}
        </span>
        {repo.fork && (
          <span style={{ fontSize: 9, color: '#6c7086', border: '1px solid #313244', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            fork
          </span>
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

function ReadmeEditor({ repos, stack }) {
  return (
    <div className="ide-editor-scroll">
      <LineNumbers count={90} />
      <div className="ide-editor-body">

        {/* Header */}
        <div className="ide-profile-header">
          <img
            className="ide-profile-photo"
            src="https://github.com/tilalx.png"
            alt="Tilo Alexander"
            onError={e => { e.target.style.display = 'none' }}
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
          <h2>## about</h2>
          <p>
            Systems and DevOps engineer based in Germany. I design and operate infrastructure —
            containers, pipelines, and the glue code that holds everything together. Most of my
            day is Dockerfiles, Linux systems, Terraform and Ansible configs, and CI/CD pipelines rather than product
            features.
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

          {/* Stack — derived from GitHub repo languages */}
          <h2>## stack</h2>
          {stack?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {stack.map(s => <StackBadge key={s.name} name={s.name} color={s.color} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {['TypeScript','JavaScript','Java','Python','Shell'].map(n => (
                <StackBadge key={n} name={n} color={LANG_COLORS[n] || '#6c7086'} />
              ))}
            </div>
          )}

          {/* Repos */}
          <h2>## repositories</h2>
          {repos?.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 10,
              marginBottom: 24,
            }}>
              {repos.map(repo => <RepoCard key={repo.name} repo={repo} />)}
            </div>
          ) : (
            <p style={{ color: '#6c7086' }}>No repositories found.</p>
          )}

          {/* Contact */}
          <h2>## contact</h2>
          <pre style={{
            background: '#11111b',
            border: '1px solid #313244',
            borderRadius: 6,
            padding: '14px 16px',
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.8,
            overflowX: 'auto',
            marginBottom: 24,
          }}>
            <span style={{ color: '#cba6f7' }}>const</span>
            <span style={{ color: '#cdd6f4' }}> contact </span>
            <span style={{ color: '#89dceb' }}>=</span>
            <span style={{ color: '#cdd6f4' }}> {'{'}</span>{'\n'}
            <span style={{ color: '#cdd6f4' }}>{'  '}github</span>
            <span style={{ color: '#89dceb' }}>:   </span>
            <a href="https://github.com/tilalx" target="_blank" rel="noopener noreferrer"
               style={{ color: '#a6e3a1', textDecoration: 'none' }}
               onMouseEnter={e => e.target.style.textDecoration='underline'}
               onMouseLeave={e => e.target.style.textDecoration='none'}>
              &quot;github.com/tilalx&quot;
            </a>
            <span style={{ color: '#6c7086' }}>,</span>{'\n'}
            <span style={{ color: '#cdd6f4' }}>{'  '}linkedin</span>
            <span style={{ color: '#89dceb' }}>: </span>
            <a href="https://www.linkedin.com/in/tilo-alexander/" target="_blank" rel="noopener noreferrer"
               style={{ color: '#a6e3a1', textDecoration: 'none' }}
               onMouseEnter={e => e.target.style.textDecoration='underline'}
               onMouseLeave={e => e.target.style.textDecoration='none'}>
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

// ============================================================
// MEME EDITOR
// ============================================================

function MemesEditor({ memeUrl, memeLoading, onNext }) {
  const [autoRunning,    setAutoRunning]    = useState(false)
  const [intervalSeconds, setIntervalSeconds] = useState(10)
  const intervalRef = useRef(null)
  const onNextRef   = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    if (autoRunning) {
      intervalRef.current = setInterval(
        () => onNextRef.current(),
        Math.max(1, intervalSeconds) * 1000
      )
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRunning, intervalSeconds])

  const toggleAuto = () => {
    setAutoRunning(prev => {
      if (!prev) onNextRef.current()
      return !prev
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Fixed toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 14px',
        background: '#181825',
        borderBottom: '1px solid #313244',
        flexShrink: 0,
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        fontSize: 12,
      }}>
        <span style={{ color: '#6a9955' }}>{'// memes.feed'}</span>
        <div style={{ flex: 1 }} />

        <button
          className={`ide-meme-btn${autoRunning ? ' stop' : ''}`}
          onClick={toggleAuto}
        >
          {autoRunning ? '■ stop' : '▶ auto'}
        </button>

        {autoRunning && <>
          <span style={{ color: '#6c7086' }}>every</span>
          <button className="ide-meme-btn" onClick={() => setIntervalSeconds(s => Math.max(1, s - 1))}>▼</button>
          <span style={{ color: '#f9e2af', minWidth: 26, textAlign: 'center' }}>{intervalSeconds}s</span>
          <button className="ide-meme-btn" onClick={() => setIntervalSeconds(s => s + 1)}>▲</button>
        </>}

        <div style={{ width: 1, height: 16, background: '#313244', flexShrink: 0 }} />

        <button className="ide-meme-btn" onClick={onNext} disabled={memeLoading}>
          {memeLoading ? 'loading…' : 'next →'}
        </button>

        {autoRunning && <span className="ide-live-dot" />}
      </div>

      {/* ── Image area fills the rest ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#11111b',
        overflow: 'hidden',
      }}>
        {memeLoading ? (
          <div className="ide-skeleton" style={{ width: '55%', height: '55%', minHeight: 200, minWidth: 200, maxWidth: 500 }} />
        ) : memeUrl ? (
          <img
            src={memeUrl}
            alt="meme"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <span style={{ color: '#6c7086', fontSize: 12, fontFamily: 'monospace' }}>
            {'// null — failed to load'}
          </span>
        )}
      </div>

    </div>
  )
}

// ============================================================
// QUOTES EDITOR
// ============================================================

function QuotesEditor({ quote, loading, onNext }) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)

  return (
    <div className="ide-editor-scroll">
      <LineNumbers count={60} />
      <div className="ide-editor-body">
        <div className="ide-quotes-editor">
          <div className="ide-quotes-log-line">
            <span className="ts">{ts}</span>
            <span className="level">INFO</span>
            <span className="msg">quotes.log — random quotes from quotes.aelx.de</span>
          </div>
          <div className="ide-quotes-log-line" style={{ marginBottom: 16 }}>
            <span className="ts">{ts}</span>
            <span className="level" style={{ color: '#89b4fa' }}>GET</span>
            <span className="msg" style={{ color: '#6c7086' }}>https://quotes.aelx.de/random?count=1</span>
          </div>

          <div className="ide-fortune-block">
            <div className="ide-fortune-prompt">$ fortune</div>
            {loading ? (
              <>
                <div className="ide-skeleton" style={{ height: 14, marginTop: 8 }} />
                <div className="ide-skeleton" style={{ height: 14, marginTop: 6, width: '72%' }} />
              </>
            ) : (
              <>
                <div className="ide-fortune-text">{quote?.content}</div>
                <div className="ide-fortune-author"># — {quote?.author || 'Unknown'}</div>
                {quote?.tags?.length > 0 && (
                  <div className="ide-fortune-tags">
                    {quote.tags.map(tag => <span key={tag} className="ide-fortune-tag">{tag}</span>)}
                  </div>
                )}
              </>
            )}
          </div>

          <button className="ide-quotes-next-btn" onClick={onNext} disabled={loading}>
            {loading ? 'loading...' : '$ fortune  # next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// RIGHT PANEL — LIVE PREVIEW
// ============================================================

function LivePreview({ memeUrl, memeLoading, quote, quoteLoading, networkLog }) {
  return (
    <div className="ide-panel-content">
      <div className="ide-api-section">
        <div className="ide-api-label">
          GET MEME-API.AELX.DE/GIMME
          <span className={`ide-api-status ${memeUrl ? 'ok' : 'err'}`}>{memeUrl ? '200' : 'ERR'}</span>
        </div>
        <div className="ide-preview-meme">
          {memeLoading ? (
            <div className="ide-skeleton" style={{ width: '100%', height: 140 }} />
          ) : memeUrl ? (
            <img src={memeUrl} alt="meme" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ color: '#6c7086', fontSize: 11, fontFamily: 'monospace', padding: 12 }}>null</div>
          )}
        </div>
      </div>

      <div className="ide-api-section">
        <div className="ide-api-label">
          GET QUOTES.AELX.DE/RANDOM
          <span className={`ide-api-status ${quote ? 'ok' : 'err'}`}>{quote ? '200' : 'ERR'}</span>
        </div>
        <div className="ide-terminal-block">
          <div className="ide-terminal-prompt">$ fortune</div>
          {quoteLoading ? (
            <>
              <div className="ide-skeleton" style={{ height: 12, marginTop: 6 }} />
              <div className="ide-skeleton" style={{ height: 12, marginTop: 4, width: '70%' }} />
            </>
          ) : (
            <>
              <div className="ide-terminal-quote">{quote?.content}</div>
              <div className="ide-terminal-author"># — {quote?.author || 'Unknown'}</div>
            </>
          )}
        </div>
      </div>

      <div className="ide-network-section">
        <div className="ide-network-header">
          Network
          <div className="ide-network-live">
            <span className="ide-live-dot" />
            live
          </div>
          <span className="ide-network-count">{networkLog.length}</span>
        </div>
        {networkLog.length === 0 ? (
          <div style={{ color: '#45475a', fontSize: 10, fontFamily: 'monospace', padding: '4px 0' }}>
            — awaiting requests
          </div>
        ) : networkLog.map((entry, i) => (
          <div key={i} className="ide-network-entry">
            <span className={`ide-net-status ${entry.ok ? 'ok' : 'err'}`}>{entry.ok ? '200' : 'ERR'}</span>
            <span className="ide-net-url">{entry.url}</span>
            <span className="ide-net-ms">{entry.ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// MOBILE COMPONENTS
// ============================================================

const IconPanel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M15 3v18"/>
  </svg>
)

function MobileHeader({ activeTab, onDrawer, onSheet }) {
  const tab = TABS.find(t => t.id === activeTab)
  return (
    <div className="ide-mobile-header">
      <button className="ide-mobile-icon-btn" onClick={onDrawer} aria-label="Explorer">
        <IconFiles />
      </button>
      <div className="ide-mobile-title">
        <span className="ide-file-dot" style={{ background: tab.color }} />
        {tab.label}
      </div>
      <button className="ide-mobile-icon-btn" onClick={onSheet} aria-label="Live Preview">
        <IconPanel />
      </button>
    </div>
  )
}

function MobileNav({ activeTab, onTabChange }) {
  return (
    <nav className="ide-mobile-nav" aria-label="Tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`ide-mobile-nav-btn${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="ide-mobile-nav-dot" style={{ background: tab.color }} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

function Drawer({ open, onClose, activeTab, onTabChange, repos }) {
  return (
    <>
      <div className={`ide-drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={id => { onTabChange(id); onClose() }}
          repos={repos}
        />
      </div>
    </>
  )
}

function PreviewSheet({ open, onClose, memeUrl, memeLoading, quote, quoteLoading, networkLog }) {
  return (
    <>
      <div className={`ide-sheet-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-sheet${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="ide-sheet-handle-bar" style={{ position: 'relative' }}>
          <div className="ide-sheet-handle" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#cdd6f4', marginLeft: 16 }}>
            LIVE PREVIEW
          </span>
          <button className="ide-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <LivePreview
          memeUrl={memeUrl}
          memeLoading={memeLoading}
          quote={quote}
          quoteLoading={quoteLoading}
          networkLog={networkLog}
        />
      </div>
    </>
  )
}

// ============================================================
// STATUS BAR
// ============================================================

function StatusBar({ tab, repos }) {
  return (
    <div className="ide-status-bar">
      <div className="ide-status-item" style={{ background: 'rgba(0,0,0,0.2)', gap: 5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M6 9v6M15 18H9"/>
        </svg>
        main
      </div>
      <div className="ide-status-item">↑0 ↓0</div>
      <div className="ide-status-item" style={{ color: '#a6e3a1' }}>● api ok</div>
      <div className="ide-status-item">{repos?.length ?? 0} repos</div>
      <div className="ide-status-sep" />
      <div className="ide-status-item">UTF-8</div>
      <div className="ide-status-item">LF</div>
      <div className="ide-status-item">
        {tab === 'readme' ? 'Markdown' : tab === 'memes' ? 'Media Feed' : 'Log'}
      </div>
      <div className="ide-status-item">Next.js</div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================

export default function IDEApp({ initialQuote, initialMeme, repos, stack }) {
  const [activeTab,      setActiveTab]      = useState('readme')
  const [activityActive, setActivityActive] = useState('explorer')
  const [panelTab,       setPanelTab]       = useState('preview')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [sheetOpen,      setSheetOpen]      = useState(false)

  const [memeUrl,     setMemeUrl]     = useState(initialMeme || '')
  const [memeLoading, setMemeLoading] = useState(!initialMeme)
  const [nextMemeUrl, setNextMemeUrl] = useState('')

  const [quote,        setQuote]        = useState(initialQuote)
  const [quoteLoading, setQuoteLoading] = useState(!initialQuote)
  const [nextQuote,    setNextQuote]    = useState(null)

  const [networkLog, setNetworkLog] = useState([])
  const addLog = useCallback((url, ok, ms) => {
    setNetworkLog(prev => [{ url, ok, ms }, ...prev].slice(0, 8))
  }, [])

  // Silently fetches and pre-loads the next meme image into the queue.
  const prefetchMeme = useCallback(async () => {
    try {
      const res  = await fetch('https://meme-api.aelx.de/gimme')
      const data = await res.json()
      const url  = data.url || ''
      if (url) {
        await new Promise(resolve => {
          const img = new window.Image()
          img.onload = img.onerror = () => resolve()
          img.src = url
        })
        setNextMemeUrl(url)
      }
    } catch {}
  }, [])

  // Silently fetches the next quote into the queue.
  const prefetchQuote = useCallback(async () => {
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
      const data = await res.json()
      if (data?.length > 0) {
        setNextQuote({
          content: stripQuotes(data[0].content),
          author:  data[0].author,
          tags:    parseTags(data[0].tags),
        })
      }
    } catch {}
  }, [])

  const nextMemeUrlRef  = useRef(nextMemeUrl)
  const nextQuoteRef    = useRef(nextQuote)
  useEffect(() => { nextMemeUrlRef.current = nextMemeUrl }, [nextMemeUrl])
  useEffect(() => { nextQuoteRef.current   = nextQuote   }, [nextQuote])

  const fetchMeme = useCallback(async () => {
    const queued = nextMemeUrlRef.current
    if (queued) {
      // Instant swap — queued image is already loaded in browser cache
      setNextMemeUrl('')
      setMemeUrl(queued)
      addLog('meme-api.aelx.de/gimme', true, 0)
      prefetchMeme()
      return
    }
    setMemeLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://meme-api.aelx.de/gimme')
      const data = await res.json()
      const url  = data.url || ''
      await new Promise(resolve => {
        const img = new window.Image()
        img.onload = img.onerror = () => resolve()
        img.src = url
      })
      setMemeUrl(url)
      addLog('meme-api.aelx.de/gimme', !!url, Date.now() - t)
    } catch {
      setMemeUrl('')
      addLog('meme-api.aelx.de/gimme', false, Date.now() - t)
    } finally {
      setMemeLoading(false)
      prefetchMeme()
    }
  }, [addLog, prefetchMeme])

  const fetchQuote = useCallback(async () => {
    const queued = nextQuoteRef.current
    if (queued) {
      setNextQuote(null)
      setQuote(queued)
      addLog('quotes.aelx.de/random', true, 0)
      prefetchQuote()
      return
    }
    setQuoteLoading(true)
    const t = Date.now()
    try {
      const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
      const data = await res.json()
      if (data?.length > 0) {
        setQuote({
          content: stripQuotes(data[0].content),
          author:  data[0].author,
          tags:    parseTags(data[0].tags),
        })
        addLog('quotes.aelx.de/random', true, Date.now() - t)
      }
    } catch {
      setQuote({ content: 'Failed to load quote.', author: '', tags: [] })
      addLog('quotes.aelx.de/random', false, Date.now() - t)
    } finally {
      setQuoteLoading(false)
      prefetchQuote()
    }
  }, [addLog, prefetchQuote])

  useEffect(() => {
    const memeReady  = !!initialMeme
    const quoteReady = !!initialQuote
    if (!memeReady)  fetchMeme();  else prefetchMeme()
    if (!quoteReady) fetchQuote(); else prefetchQuote()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumb = TABS.find(t => t.id === activeTab)?.label || 'README.md'

  return (
    <div className="ide-root">
      {/* ── Mobile header (hidden on desktop) ── */}
      <MobileHeader
        activeTab={activeTab}
        onDrawer={() => setDrawerOpen(true)}
        onSheet={() => setSheetOpen(true)}
      />

      {/* ── Overlays (position:fixed, always in DOM) ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        repos={repos}
      />
      <PreviewSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        memeUrl={memeUrl}
        memeLoading={memeLoading}
        quote={quote}
        quoteLoading={quoteLoading}
        networkLog={networkLog}
      />

      {/* ── Main row: panels side-by-side ── */}
      <div className="ide-main">
        <ActivityBar active={activityActive} onSelect={setActivityActive} />
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} repos={repos} />

        <div className="ide-editor-wrap">
          <div className="ide-tab-bar">
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`ide-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="ide-tab-dot" style={{ background: tab.color }} />
                {tab.label}
                <span className="ide-tab-close">×</span>
              </div>
            ))}
          </div>

          <div className="ide-breadcrumb">
            <span>tilalx.dev</span>
            <span className="ide-breadcrumb-sep">›</span>
            <span className="ide-breadcrumb-active">{breadcrumb}</span>
          </div>

          {activeTab === 'readme' && <ReadmeEditor repos={repos} stack={stack} />}
          {activeTab === 'memes'  && <MemesEditor memeUrl={memeUrl} memeLoading={memeLoading} onNext={fetchMeme} />}
          {activeTab === 'quotes' && <QuotesEditor quote={quote} loading={quoteLoading} onNext={fetchQuote} />}
        </div>

        <div className="ide-right-panel">
          <div className="ide-panel-tabs">
            {[
              { id: 'preview',  label: 'Live Preview' },
              { id: 'problems', label: 'Problems'     },
              { id: 'terminal', label: 'Terminal'     },
            ].map(pt => (
              <div
                key={pt.id}
                className={`ide-panel-tab${panelTab === pt.id ? ' active' : ''}`}
                onClick={() => setPanelTab(pt.id)}
              >
                {pt.label}
              </div>
            ))}
          </div>

          {panelTab === 'preview' && (
            <LivePreview
              memeUrl={memeUrl}
              memeLoading={memeLoading}
              quote={quote}
              quoteLoading={quoteLoading}
              networkLog={networkLog}
            />
          )}
          {panelTab === 'problems' && (
            <div style={{ padding: 12, color: '#a6e3a1', fontSize: 11, fontFamily: 'monospace' }}>
              ✓ No problems detected
            </div>
          )}
          {panelTab === 'terminal' && (
            <div style={{ padding: 12, fontFamily: 'monospace', fontSize: 11 }}>
              <div style={{ color: '#a6e3a1' }}>tilalx@dev:~$&nbsp;</div>
              <div style={{ color: '#cdd6f4', marginTop: 4 }}>next dev --port 3000</div>
              <div style={{ color: '#6c7086', marginTop: 6 }}>▶ Ready on http://localhost:3000</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      <StatusBar tab={activeTab} repos={repos} />
    </div>
  )
}
