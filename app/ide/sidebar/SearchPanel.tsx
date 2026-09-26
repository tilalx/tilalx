import { useState, useMemo, useRef, useEffect } from 'react'
import { IconChevron, FileIcon, IconCollapseAll, IconExpandAll, IconClearAll } from '../icons'
import { ViewTitle, README_OUTLINE } from './shared'
import type { Repo, StackItem, TabKind } from '../types'

interface SearchFlags { caseSensitive: boolean; wholeWord: boolean; regex: boolean }

function buildMatcher(query: string, f: SearchFlags): RegExp | null | 'invalid' {
  if (!query) return null
  let src = f.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (f.wholeWord) src = `\\b(?:${src})\\b`
  try { return new RegExp(src, f.caseSensitive ? '' : 'i') } catch { return 'invalid' }
}

function SearchHighlight({ text, re }: { text: string; re: RegExp }) {
  const m = re.exec(text)
  if (!m || !m[0]) return <span className="ide-search-label">{text}</span>
  return (
    <span className="ide-search-label">
      {text.slice(0, m.index)}
      <mark className="ide-search-mark">{m[0]}</mark>
      {text.slice(m.index + m[0].length)}
    </span>
  )
}

interface SearchHit { group: string; label: string; preview: string; action: () => void }

interface SearchPanelProps {
  repos:         Repo[]
  stack:         StackItem[]
  onTabChange:   (id: TabKind) => void
  fileContents?: Record<string, string> | null
  onOpenFile?:   (file: string, line?: number) => void
}

export default function SearchPanel({ repos, stack, onTabChange, fileContents, onOpenFile }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [flags, setFlags] = useState<SearchFlags>({ caseSensitive: false, wholeWord: false, regex: false })
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const matcher = useMemo(() => buildMatcher(query, flags), [query, flags])
  const re = matcher instanceof RegExp ? matcher : null

  const results = useMemo(() => {
    if (!re) return []
    const has = (text: string) => re.test(text)
    const hits: SearchHit[] = []

    README_OUTLINE.forEach(o => {
      if (has(o.text))
        hits.push({ group: 'README.md', label: o.text, preview: o.level, action: () => onTabChange('readme') })
    })

    repos?.forEach(r => {
      if (has(r.name) || has(r.description || ''))
        hits.push({ group: 'repos', label: r.name, preview: r.description || 'no description', action: () => onTabChange('readme') })
    })

    stack?.forEach(s => {
      if (has(s.name))
        hits.push({ group: 'stack', label: s.name, preview: 'language / tool', action: () => onTabChange('readme') })
    })

    ;[
      { label: 'github.com/tilalx',              preview: 'contact → github'   },
      { label: 'linkedin.com/in/tilo-alexander', preview: 'contact → linkedin' },
    ].forEach(c => {
      if (has(c.label))
        hits.push({ group: 'contact', label: c.label, preview: c.preview, action: () => onTabChange('readme') })
    })

    if (fileContents) {
      let total = 0
      Object.entries(fileContents).forEach(([filepath, content]) => {
        if (total >= 60) return
        let fileCount = 0
        content.split('\n').forEach((line, idx) => {
          if (fileCount >= 5 || total >= 60) return
          if (has(line)) {
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
  }, [re, repos, stack, onTabChange, fileContents, onOpenFile])

  const grouped = useMemo(() => results.reduce<Record<string, SearchHit[]>>((acc, item) => {
    ;(acc[item.group] = acc[item.group] || []).push(item)
    return acc
  }, {}), [results])

  const allCollapsed = Object.keys(grouped).length > 0 && Object.keys(grouped).every(g => collapsed.has(g))

  return (
    <div className="ide-sidebar">
      <ViewTitle title="Search" actions={[
        { title: 'Clear Search Results', icon: <IconClearAll />, onClick: () => { setQuery(''); inputRef.current?.focus() } },
        allCollapsed
          ? { title: 'Expand All',   icon: <IconExpandAll />,   onClick: () => setCollapsed(new Set()) }
          : { title: 'Collapse All', icon: <IconCollapseAll />, onClick: () => setCollapsed(new Set(Object.keys(grouped))) },
      ]} />
      <div className="ide-search-box">
        <div className={`ide-search-field${matcher === 'invalid' ? ' invalid' : ''}`}>
          <input
            ref={inputRef}
            className="ide-search-input"
            placeholder="Search"
            aria-label="Search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            spellCheck={false}
          />
          {([
            ['caseSensitive', 'Aa',  'Match Case (Alt+C)'],
            ['wholeWord',     'ab',  'Match Whole Word (Alt+W)'],
            ['regex',         '.*',  'Use Regular Expression (Alt+R)'],
          ] as const).map(([key, glyph, title]) => (
            <button
              key={key}
              className={`ide-search-toggle${flags[key] ? ' on' : ''}${key === 'wholeWord' ? ' underline' : ''}`}
              title={title}
              aria-label={title}
              aria-pressed={flags[key]}
              onClick={() => setFlags(f => ({ ...f, [key]: !f[key] }))}
            >{glyph}</button>
          ))}
        </div>
      </div>
      {re && (
        <div className="ide-search-summary">
          {results.length === 0
            ? 'No results found. Review your settings for configured exclusions.'
            : `${results.length} result${results.length === 1 ? '' : 's'} in ${Object.keys(grouped).length} file${Object.keys(grouped).length === 1 ? '' : 's'}`}
        </div>
      )}
      {re && Object.entries(grouped).map(([group, items]) => {
        const open = !collapsed.has(group)
        const name = group.split('/').pop()!
        const dir  = group.includes('/') ? group.slice(0, group.lastIndexOf('/')) : ''
        return (
          <div key={group}>
            <div
              className="ide-file-item ide-search-file"
              onClick={() => setCollapsed(c => { const n = new Set(c); if (n.has(group)) n.delete(group); else n.add(group); return n })}
            >
              <IconChevron open={open} />
              <FileIcon name={group} />
              <span className="ide-search-file-name">{name}</span>
              {dir && <span className="ide-search-file-dir">{dir}</span>}
              <span className="ide-section-badge">{items.length}</span>
            </div>
            {open && items.map((item, i) => (
              <div key={i} className="ide-search-result" onClick={item.action} title={item.preview}>
                <SearchHighlight text={item.label} re={re} />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
