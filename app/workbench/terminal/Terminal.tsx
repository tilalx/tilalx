'use client'

import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useWorkbench } from '../context'
import type { ResolvedTheme } from '../theme'
import { editorFont } from '../editors/monaco'
import { COMMANDS as WB_COMMANDS } from '../commands'
import type { SearchResult } from '../server'
import { commonPrefix, complete, newState, prompt, run, stripAnsi } from './shell'
import type { ShellEnv } from './shell'
import { edit, searchHistory } from './lineEditor'

const ANSI = {
  dark: {
    black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510', blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
    brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b', brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6', brightCyan: '#29b8db', brightWhite: '#e5e5e5',
  },
  light: {
    black: '#000000', red: '#cd3131', green: '#00bc00', yellow: '#949800', blue: '#0451a5', magenta: '#bc05bc', cyan: '#0598bc', white: '#555555',
    brightBlack: '#666666', brightRed: '#cd3131', brightGreen: '#14ce14', brightYellow: '#b5ba00', brightBlue: '#0451a5', brightMagenta: '#bc05bc', brightCyan: '#0598bc', brightWhite: '#a5a5a5',
  },
}

function xtermTheme(theme: ResolvedTheme) {
  const col = theme.colors
  return {
    ...ANSI[theme.type],
    background: col['terminal.background'] ?? col['panel.background'] ?? col['editor.background'],
    foreground: col['terminal.foreground'] ?? col['editor.foreground'],
    cursor: col['terminalCursor.foreground'] ?? col['terminal.foreground'] ?? col['editor.foreground'],
    selectionBackground: col['terminal.selectionBackground'] ?? (theme.type === 'dark' ? '#264f78' : '#add6ff'),
  }
}

const startedAt = Date.now()
const HISTORY_KEY = 'tilalx.terminal.history'

function loadHistory(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
function saveHistory(history: string[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500))) } catch {}
}

export default function Terminal({ visible }: { visible: boolean }) {
  const wb = useWorkbench()
  const host = useRef<HTMLDivElement>(null)
  const term = useRef<XTerm | null>(null)
  const fit  = useRef<{ fit(): void } | null>(null)
  const wbRef = useRef(wb)
  wbRef.current = wb
  const visibleRef = useRef(visible)
  visibleRef.current = visible

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}
    ;(async () => {
      const [{ Terminal: XTermCtor }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/addon-web-links'),
      ])
      if (disposed || !host.current) return
      const font = editorFont()
      const t = new XTermCtor({
        fontFamily: font.fontFamily, fontSize: font.fontSize, lineHeight: 1,
        cursorBlink: true, cursorStyle: 'block', allowProposedApi: false,
        theme: xtermTheme(wbRef.current.theme), scrollback: 1000,
      })
      const f = new FitAddon()
      t.loadAddon(f)
      t.loadAddon(new WebLinksAddon((_, uri) => window.open(uri, '_blank', 'noopener')))
      t.open(host.current)
      f.fit()
      term.current = t
      fit.current = f

      const files = new Map<string, string>()
      const state = newState()
      const history = loadHistory()
      const env = (signal?: AbortSignal): ShellEnv => {
        const w = wbRef.current
        return {
          tree: w.data.tree, git: w.data.git, branch: w.data.branch, commits: w.data.commits, repos: w.data.repos,
          readFile: async path => {
            const known = w.fileText(path) ?? files.get(path)
            if (known !== undefined) return known
            const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { signal })
            if (!res.ok) return null
            const text = await res.text()
            files.set(path, text)
            return text
          },
          search: async (source, opts) => {
            if (source.length > 200) return 'pattern too long'
            const q = new URLSearchParams({ q: source, regex: '1', case: opts.caseSensitive ? '1' : '0', word: opts.wholeWord ? '1' : '0' })
            const json = await (await fetch(`/api/search?${q}`, { signal })).json() as SearchResult[] | { error: string }
            if (!Array.isArray(json)) return json.error
            return json.flatMap(r => r.matches.map(m => ({ path: r.path, line: m.line, text: m.text })))
          },
          fetchUrl: async url => {
            const res = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal })
            const json = await res.json() as { text?: string; error?: string }
            if (json.error) throw new Error(json.error)
            return json.text ?? ''
          },
          openFile: (path, line) => line ? w.reveal(path, line) : w.open({ type: 'file', path }),
          openUrl: url => window.open(url, '_blank', 'noopener'),
          setTheme: type => w.setTheme(type === 'dark' ? 'dark-modern' : 'light-modern'),
          commands: WB_COMMANDS.filter(x => !x.hidden).map(({ id, title }) => ({ id, title })),
          runCommand: id => w.runCommand(id),
          history, startedAt, signal,
        }
      }

      let line = ''
      let cursor = 0
      let histIdx = history.length
      let running: AbortController | null = null
      // Ctrl+R reverse search: the query, and the history index of the current match
      let search: { query: string; at: number } | null = null

      const promptText = () => search ? `(reverse-i-search)\x1b[33m'${search.query}'\x1b[0m: ` : prompt(state)
      let shownRow = 0
      const redraw = () => {
        const cols = t.cols, p = stripAnsi(promptText()).length
        let out = '\r' + (shownRow > 0 ? `\x1b[${shownRow}A` : '') + '\x1b[J' + promptText() + line
        if ((p + line.length) % cols === 0 && line.length) out += ' \r'
        const endRow = Math.floor((p + line.length) / cols)
        const row = Math.floor((p + cursor) / cols), col = (p + cursor) % cols
        out += '\r' + (endRow > row ? `\x1b[${endRow - row}A` : '') + (col ? `\x1b[${col}C` : '')
        t.write(out)
        shownRow = row
      }
      const toEnd = () => { cursor = line.length; redraw() }
      const newLine = () => { line = ''; cursor = 0; shownRow = 0 }
      const endSearch = () => { if (search) { search = null; redraw() } }

      t.writeln(`\x1b[2mtilalx terminal. Type \x1b[0m\x1b[36mhelp\x1b[0m\x1b[2m to see what works.\x1b[0m`)
      t.write(prompt(state))
      if (visibleRef.current) t.focus()

      const submit = async () => {
        endSearch()
        const cmd = line.trim()
        toEnd()
        t.write('\r\n')
        newLine()
        if (cmd) {
          if (history.at(-1) !== cmd) { history.push(cmd); saveHistory(history) }
          histIdx = history.length
          const ac = new AbortController()
          running = ac
          const cancelled = new Promise<null>(r => ac.signal.addEventListener('abort', () => r(null)))
          try {
            const res = await Promise.race([run(cmd, state, env(ac.signal)), cancelled])
            if (res && !ac.signal.aborted) {
              if (res.clear) t.clear()
              // One write per command keeps xterm fast on long output.
              if (res.lines.length) t.write(res.lines.join('\r\n') + '\r\n')
            }
          } catch (e) {
            if (!ac.signal.aborted) t.writeln(`bash: ${cmd.split(' ')[0]}: ${(e as Error).message || 'failed'}`)
          } finally {
            running = null
          }
          if (ac.signal.aborted) return
        }
        t.write(prompt(state))
      }

      const complete_ = () => {
        const before = line.slice(0, cursor)
        const { word, options } = complete(before, state, env())
        if (!options.length) return
        const shared = commonPrefix(options)
        if (shared.length > word.length || options.length === 1) {
          const add = shared.slice(word.length) + (options.length === 1 && !shared.endsWith('/') ? ' ' : '')
          line = before + add + line.slice(cursor); cursor += add.length; redraw()
        } else {
          const at = cursor
          toEnd(); t.write('\r\n' + options.join('  ') + '\r\n'); shownRow = 0; cursor = at; redraw()
        }
      }

      const sub = t.onData(data => {
        if (running) {
          if (data === '\x03') { running.abort(); t.write('^C\r\n' + prompt(state)) }
          return
        }
        if (search) {
          if (data === '\x12') {
            const at = searchHistory(history, search.query, search.at)
            if (at >= 0) { search.at = at; line = history[at]; cursor = line.length }
            redraw(); return
          }
          if (data === '\x7f' || (data.length === 1 && data >= ' ')) {
            search.query = data === '\x7f' ? search.query.slice(0, -1) : search.query + data
            const at = searchHistory(history, search.query)
            search.at = at < 0 ? search.at : at
            if (at >= 0) { line = history[at]; cursor = line.length }
            redraw(); return
          }
          if (data === '\x07' || data === '\x03') { search = null; newLine(); redraw(); return }
          if (data !== '\r') { endSearch(); if (data === '\x1b') return }
        }
        switch (data) {
          case '\r': submit(); return
          case '\x12': search = { query: '', at: history.length }; redraw(); return
          case '\x1b[A': case '\x10':
            if (histIdx > 0) { histIdx--; line = history[histIdx]; cursor = line.length; redraw() }
            return
          case '\x1b[B': case '\x0e':
            if (histIdx < history.length) { histIdx++; line = history[histIdx] ?? ''; cursor = line.length; redraw() }
            return
          case '\x03': toEnd(); t.write('^C\r\n'); newLine(); t.write(prompt(state)); return
          case '\x0c': t.clear(); redraw(); return
          case '\t': complete_(); return
        }
        const next = edit({ line, cursor }, data)
        if (next) { line = next.line; cursor = next.cursor; redraw() }
      })

      const ro = new ResizeObserver(() => { try { f.fit() } catch {} })
      ro.observe(host.current)
      cleanup = () => { ro.disconnect(); sub.dispose(); t.dispose() }
    })()
    return () => { disposed = true; cleanup(); term.current = null }
  }, [])

  useEffect(() => { if (term.current) term.current.options.theme = xtermTheme(wb.theme) }, [wb.theme])
  useEffect(() => {
    if (!visible) return
    requestAnimationFrame(() => { try { fit.current?.fit() } catch {} term.current?.focus() })
  }, [visible])

  return <div ref={host} className="terminal-host" />
}
