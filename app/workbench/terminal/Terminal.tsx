'use client'

import { useEffect, useRef } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useWorkbench } from '../context'
import type { ResolvedTheme } from '../theme'
import { editorFont } from '../editors/monaco'
import { complete, prompt, run } from './shell'
import type { ShellEnv, ShellState } from './shell'

/** VS Code's terminal color registry defaults (terminalColorRegistry.ts). */
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
      const state: ShellState = { cwd: '' }
      const history: string[] = []
      const env = (): ShellEnv => {
        const w = wbRef.current
        return {
          tree: w.data.tree, git: w.data.git, branch: w.data.branch, commits: w.data.commits, repos: w.data.repos,
          readFile: async path => {
            const known = w.fileText(path) ?? files.get(path)
            if (known !== undefined) return known
            const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`)
            if (!res.ok) return null
            const text = await res.text()
            files.set(path, text)
            return text
          },
          openFile: (path, line) => line ? w.reveal(path, line) : w.open({ type: 'file', path }),
          setTheme: type => w.setTheme(type === 'dark' ? 'dark-modern' : 'light-modern'),
          history, startedAt,
        }
      }

      let line = ''
      let cursor = 0
      let histIdx = 0
      let busy = false

      const redraw = () => {
        t.write(`\r\x1b[2K${prompt(state)}${line}`)
        const back = line.length - cursor
        if (back > 0) t.write(`\x1b[${back}D`)
      }

      t.writeln(`\x1b[2mtilalx terminal. Type \x1b[0m\x1b[36mhelp\x1b[0m\x1b[2m to see what works.\x1b[0m`)
      t.write(prompt(state))
      // xterm loads asynchronously, after the panel already asked for focus.
      if (visibleRef.current) t.focus()

      const submit = async () => {
        const cmd = line.trim()
        t.write('\r\n')
        line = ''; cursor = 0
        if (cmd) {
          history.push(cmd)
          histIdx = history.length
          busy = true
          try {
            const out = await run(cmd, state, env())
            if (out === 'clear') t.clear()
            else for (const l of out) t.writeln(l)
          } catch (e) {
            t.writeln(`bash: ${cmd.split(' ')[0]}: ${(e as Error).message || 'failed'}`)
          } finally {
            busy = false
          }
        }
        t.write(prompt(state))
      }

      const sub = t.onData(data => {
        if (busy) return
        switch (data) {
          case '\r': submit(); return
          case '\x7f':
            if (cursor > 0) { line = line.slice(0, cursor - 1) + line.slice(cursor); cursor--; redraw() }
            return
          case '\x1b[A':
            if (histIdx > 0) { histIdx--; line = history[histIdx]; cursor = line.length; redraw() }
            return
          case '\x1b[B':
            if (histIdx < history.length) { histIdx++; line = history[histIdx] ?? ''; cursor = line.length; redraw() }
            return
          case '\x1b[D': if (cursor > 0) { cursor--; t.write(data) } return
          case '\x1b[C': if (cursor < line.length) { cursor++; t.write(data) } return
          case '\x1b[H': case '\x01': cursor = 0; redraw(); return
          case '\x1b[F': case '\x05': cursor = line.length; redraw(); return
          case '\x03': t.write('^C\r\n'); line = ''; cursor = 0; t.write(prompt(state)); return
          case '\x0c': t.clear(); redraw(); return
          case '\x15': line = line.slice(cursor); cursor = 0; redraw(); return
          case '\t': {
            const before = line.slice(0, cursor)
            const options = complete(before, state, env())
            if (options.length === 1) {
              const word = before.match(/\S*$/)?.[0] ?? ''
              const add = options[0].slice(word.length) + (options[0].endsWith('/') ? '' : ' ')
              line = before + add + line.slice(cursor); cursor += add.length; redraw()
            } else if (options.length > 1) {
              t.write('\r\n' + options.join('  ') + '\r\n'); redraw()
            }
            return
          }
        }
        if (data.startsWith('\x1b')) return
        const printable = data.replace(/[\x00-\x1f]/g, '')
        if (!printable) return
        line = line.slice(0, cursor) + printable + line.slice(cursor)
        cursor += printable.length
        redraw()
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
