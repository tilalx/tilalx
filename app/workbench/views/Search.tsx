'use client'

import { useEffect, useRef, useState } from 'react'
import { pressable } from '../pressable'
import { Codicon, FileIcon } from '../icons'
import { useWorkbench } from '../context'
import { basename } from '../languages'
import { ViewTitle } from './Pane'

interface Match { line: number; text: string; start: number; end: number }
interface Result { path: string; matches: Match[] }

function Toggle({ icon, title, on, set }: { icon: string; title: string; on: boolean; set(v: boolean): void }) {
  return (
    <button className={`input-toggle${on ? ' checked' : ''}`} title={title} aria-pressed={on} onClick={() => set(!on)}>
      <Codicon name={icon} />
    </button>
  )
}

/** Shows the match with some leading context, like VS Code trims long preview lines. */
function preview(m: Match) {
  const lead = Math.max(0, m.start - 26)
  const before = (lead > 0 ? '…' : '') + m.text.slice(lead, m.start).trimStart()
  return <><span>{before}</span><span className="search-match">{m.text.slice(m.start, m.end)}</span><span>{m.text.slice(m.end)}</span></>
}

export default function Search() {
  const wb = useWorkbench()
  const [query, setQuery] = useState('')
  const [caseSensitive, setCase] = useState(false)
  const [wholeWord, setWord]     = useState(false)
  const [regex, setRegex]        = useState(false)
  const [results, setResults]    = useState<Result[] | null>(null)
  const [runs, setRuns]          = useState(0)
  const [error, setError]        = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query) { setResults(null); setError(null); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      const qs = new URLSearchParams({ q: query, case: caseSensitive ? '1' : '0', word: wholeWord ? '1' : '0', regex: regex ? '1' : '0' })
      try {
        const res  = await fetch(`/api/search?${qs}`, { signal: ctrl.signal })
        const json = await res.json()
        if (Array.isArray(json)) { setResults(json); setError(null) } else { setResults([]); setError(json?.error ?? 'Search failed.') }
      } catch {
        if (!ctrl.signal.aborted) { setResults([]); setError('Search failed. Check your connection and try again.') }
      }
    }, 300)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, caseSensitive, wholeWord, regex, runs])

  const total = results?.reduce((n, r) => n + r.matches.length, 0) ?? 0

  return (
    <>
      <ViewTitle title="Search" actions={[
        { icon: 'refresh', title: 'Refresh', run: () => setRuns(n => n + 1) },
        { icon: 'clear-all', title: 'Clear Search Results', run: () => setQuery('') },
        { icon: 'collapse-all', title: 'Collapse All', run: () => setCollapsed(new Set(results?.map(r => r.path))) },
      ]} />
      <div className="sidebar-content search-view">
        <div className="search-widget">
          <button className="search-replace-toggle" title="Toggle Replace" disabled><Codicon name="chevron-right" /></button>
          <div className="monaco-inputbox">
            <textarea
              ref={inputRef}
              rows={1}
              value={query}
              placeholder="Search"
              aria-label="Search"
              spellCheck={false}
              onChange={e => setQuery(e.target.value.replace(/\n/g, ''))}
            />
            <div className="input-toggles">
              <Toggle icon="case-sensitive" title="Match Case" on={caseSensitive} set={setCase} />
              <Toggle icon="whole-word" title="Match Whole Word" on={wholeWord} set={setWord} />
              <Toggle icon="regex" title="Use Regular Expression" on={regex} set={setRegex} />
            </div>
          </div>
        </div>
        {error && <div className="search-message error">{error}</div>}
        {results && !error && (
          <div className="search-message">
            {total === 0 ? 'No results found. Review your settings for configured exclusions and check your gitignore files.' : `${total} result${total === 1 ? '' : 's'} in ${results.length} file${results.length === 1 ? '' : 's'}`}
          </div>
        )}
        <div className="list search-results scrollable" role="tree">
          {results?.map(r => {
            const open = !collapsed.has(r.path)
            return (
              <div key={r.path}>
                <div
                  className="list-row"
                  aria-expanded={open}
                  {...pressable(() => setCollapsed(c => { const n = new Set(c); if (n.has(r.path)) n.delete(r.path); else n.add(r.path); return n }), 'treeitem')}
                >
                  <span className="tree-lead folder"><Codicon name={open ? 'chevron-down' : 'chevron-right'} /></span>
                  <span className="tree-label">
                    <FileIcon path={r.path} light={wb.theme.type === 'light'} />
                    <span className="name">{basename(r.path)}</span>
                    <span className="description">{r.path.split('/').slice(0, -1).join('/')}</span>
                    <span className="badge">{r.matches.length}</span>
                  </span>
                </div>
                {open && r.matches.map((m, i) => (
                  <div
                    key={i}
                    className="list-row search-line"
                    style={{ paddingLeft: 12 }}
                    title={m.text.trim()}
                    {...pressable(() => wb.reveal(r.path, m.line), 'treeitem')}
                  >
                    <span className="tree-lead folder" />
                    <span className="tree-label"><span className="name">{preview(m)}</span></span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
