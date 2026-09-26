'use client'

import { useEffect, useRef, useState } from 'react'
import type { ITheme, Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { completions, runPipeline, runShell, type Effect, type Files, type ShellCtx } from './shell'
import type { UseChatResult } from './useChat'
import type { Commit, FileNode, Repo, StackItem, TerminalGroup, ThemeVars } from './types'

// Fallbacks match :root (Dark Modern).
const buildTheme = (v: ThemeVars = {}): ITheme => {
  const c = (k: string, d: string) => v[k] || d
  const [red, green, yellow, blue, magenta, cyan] = [
    c('--ide-red', '#f14c4c'), c('--ide-green', '#89d185'), c('--ide-yellow', '#cca700'),
    c('--ide-accent', '#4daafc'), c('--ide-purple', '#c586c0'), c('--ide-cyan', '#29b8db'),
  ]
  return {
    black: c('--ide-surface', '#474747'), red, green, yellow, blue, magenta, cyan, white: c('--ide-text', '#cccccc'),
    brightBlack: c('--ide-surface2', '#616161'), brightRed: red, brightGreen: green, brightYellow: yellow,
    brightBlue: blue, brightMagenta: magenta, brightCyan: cyan, brightWhite: c('--ide-fg2', '#9d9d9d'),
    background:          c('--ide-bg', '#1f1f1f'),
    foreground:          c('--ide-fg', '#cccccc'),
    cursor:              c('--ide-accent', '#4daafc'),
    cursorAccent:        c('--ide-bg', '#1f1f1f'),
    selectionBackground: c('--ide-fg2', '#9d9d9d') + '40',
  }
}

const PS1_BOT = '\x1b[36m>\x1b[0m '

const commonPrefix = (arr: string[]) => {
  if (!arr.length) return ''
  let prefix = arr[0]
  for (const s of arr) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1)
    if (!prefix) break
  }
  return prefix
}

const CLEAR_SCREEN = '\x1b[2J\x1b[3J\x1b[H' // clear viewport + scrollback + home

interface TerminalData {
  repos:      Repo[] | null | undefined
  stack:      StackItem[] | null | undefined
  commits:    Commit[] | null | undefined
  fileTree:   FileNode[] | undefined
  files:      Files
  onOpenFile: (path: string, line?: number) => void
  chat:       Pick<UseChatResult, 'complete' | 'stop' | 'status'>
}

interface XTermPaneProps extends TerminalData {
  isActive:  boolean
  themeVars: ThemeVars
  fontSize:  number
}

function XTermPane({ repos, stack, commits, fileTree, files, onOpenFile, chat, isActive, themeVars, fontSize }: XTermPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fitRef       = useRef<FitAddon | null>(null)
  const termRef      = useRef<Terminal | null>(null)
  const reposRef     = useRef(repos)
  const stackRef     = useRef(stack)
  const commitsRef   = useRef(commits)
  const fileTreeRef  = useRef(fileTree)
  const filesRef     = useRef(files)
  const openRef      = useRef(onOpenFile)
  const chatRef      = useRef(chat)
  const themeRef     = useRef(themeVars)
  const fontSizeRef  = useRef(fontSize)

  useEffect(() => { reposRef.current    = repos    }, [repos])
  useEffect(() => { stackRef.current    = stack    }, [stack])
  useEffect(() => { commitsRef.current  = commits  }, [commits])
  useEffect(() => { fileTreeRef.current = fileTree }, [fileTree])
  useEffect(() => { filesRef.current = files; openRef.current = onOpenFile; chatRef.current = chat })

  useEffect(() => {
    themeRef.current = themeVars
    if (termRef.current) termRef.current.options.theme = buildTheme(themeVars)
  }, [themeVars])

  useEffect(() => {
    fontSizeRef.current = fontSize
    if (termRef.current) {
      termRef.current.options.fontSize = fontSize
      try { fitRef.current?.fit() } catch {}
    }
  }, [fontSize])

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => {
        try { fitRef.current?.fit() } catch {}
        try { termRef.current?.focus() } catch {}
      })
    }
  }, [isActive])

  useEffect(() => {
    if (!containerRef.current) return
    let xterm: Terminal | undefined, ro: ResizeObserver | undefined, disposed = false

    ;(async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ])
      // Unmounted while the imports loaded (StrictMode double-mount).
      if (disposed || !containerRef.current) return

      const term = xterm = new Terminal({
        theme: buildTheme(themeRef.current),
        fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
        fontSize: fontSizeRef.current || 13,
        lineHeight: 1.45,
        cursorBlink: true,
        scrollback: 1000,
      })

      const fit = new FitAddon()
      fitRef.current = fit
      termRef.current = term
      term.loadAddon(fit)
      term.loadAddon(new WebLinksAddon())
      term.open(containerRef.current)
      requestAnimationFrame(() => { try { fit.fit() } catch {} })

      ro = new ResizeObserver(() => { try { fit.fit() } catch {} })
      ro.observe(containerRef.current)

      let line    = ''
      let history: string[] = []
      let histIdx = -1
      let cwd     = ''
      let busy    = false
      let abort: (() => void) | null = null // Ctrl+C while curl/ask runs

      const ctx = (): ShellCtx => ({
        files: filesRef.current, cwd,
        repos: reposRef.current, stack: stackRef.current, commits: commitsRef.current, fileTree: fileTreeRef.current,
      })

      const writePrompt = (fresh = false) => {
        const top = `\r\n\x1b[32mtilo@aelx\x1b[0m \x1b[34m~/Github/tilalx${cwd ? '/' + cwd : ''}\x1b[0m \x1b[33m(main)\x1b[0m\r\n`
        term.write((fresh ? top.trimStart() : top) + PS1_BOT)
      }

      // One write per command: far cheaper for xterm than thousands of writeln calls.
      const print = (lines: string[]) => { if (lines.length) term.write(lines.join('\r\n') + '\r\n') }
      const printErr = (msg: string) => print([`\x1b[31m${msg}\x1b[0m`])

      const redrawLine = () => term.write('\r\x1b[2K' + PS1_BOT + line)

      const ask = async (prompt: string, context?: string) => {
        if (chatRef.current.status !== 'ready') print(['\x1b[2mloading the local model… (progress is shown in the Chat panel)\x1b[0m'])
        abort = () => chatRef.current.stop()
        let wrote = false
        try {
          await chatRef.current.complete(prompt, context, delta => {
            wrote = true
            term.write('\x1b[36m' + delta.replace(/\r?\n/g, '\r\n') + '\x1b[0m')
          })
          if (wrote) term.write('\r\n')
        } catch (e) {
          if (wrote) term.write('\r\n')
          printErr(`ask: ${(e as Error).message || 'generation failed'}`)
        }
      }

      const runEffect = async (effect: Effect) => {
        if (effect.kind === 'open') { openRef.current(effect.path, effect.line); return }
        if (effect.kind === 'ask') { await ask(effect.prompt, effect.context); return }
        const ctrl = new AbortController()
        abort = () => ctrl.abort()
        let text: string
        try {
          const res  = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: effect.url }), signal: ctrl.signal })
          const data = await res.json()
          if (data.error) { printErr(`curl: ${data.error}`); return }
          text = data.text
        } catch (e) {
          if ((e as Error).name !== 'AbortError') printErr(`curl: ${(e as Error).message}`)
          return
        }
        const r = runPipeline(effect.rest.length ? effect.rest : [['cat']], text.split('\n'), ctx())
        if (r.out) print(r.out)
        if (r.effect?.kind === 'ask') await ask(r.effect.prompt, r.effect.context)
      }

      const runLine = async () => {
        const cmd = line.trim()
        if (cmd) history = [cmd, ...history.slice(0, 49)]
        histIdx = -1
        line = ''
        term.write('\r\n')
        if (!cmd) { writePrompt(); return }

        const r = runShell(cmd, ctx())
        if (r.cwd !== undefined) cwd = r.cwd
        if (r.out === null) { term.write(CLEAR_SCREEN); writePrompt(true); return }
        print(r.out)
        if (r.effect) {
          busy = true
          try { await runEffect(r.effect) } finally { busy = false; abort = null }
          if (disposed) return
        }
        writePrompt()
      }

      const complete = () => {
        const opts = completions(line, ctx())
        if (!opts.length) return
        const word   = /(\S*)$/.exec(line)![1]
        const prefix = commonPrefix(opts)
        if (prefix.length > word.length) {
          let rest = prefix.slice(word.length)
          if (opts.length === 1 && !prefix.endsWith('/')) rest += ' '
          line += rest
          term.write(rest)
        } else if (opts.length > 1) {
          term.write('\r\n\x1b[2m' + opts.join('  ') + '\x1b[0m')
          writePrompt()
          term.write(line)
        }
      }

      term.writeln('\x1b[32mWelcome to fish, the friendly interactive shell\x1b[0m')
      term.writeln('\x1b[2mType \x1b[0m\x1b[36mhelp\x1b[2m for commands — try \x1b[0m\x1b[36mgrep -i terminal app\x1b[2m or \x1b[0m\x1b[36mask what is this site\x1b[0m')
      writePrompt(true)

      term.onData(data => {
        if (busy) {
          if (data === '\x03') { term.write('^C'); abort?.() }
          return
        }
        switch (data) {
          case '\r':
            void runLine()
            return
          case '\x7f': // Backspace
          case '\b':
            if (line.length > 0) { line = line.slice(0, -1); term.write('\b \b') }
            return
          case '\t':
            complete()
            return
          case '\x03': // Ctrl+C
            term.write('^C')
            line = ''; histIdx = -1
            writePrompt()
            return
          case '\x0c': // Ctrl+L
            term.write(CLEAR_SCREEN)
            writePrompt(true)
            term.write(line)
            return
          case '\x15': // Ctrl+U
            line = ''
            term.write('\r\x1b[2K' + PS1_BOT)
            return
          case '\x1b[A': // Up
            if (!history.length) return
            histIdx = Math.min(histIdx + 1, history.length - 1)
            line = history[histIdx]
            redrawLine()
            return
          case '\x1b[B': // Down
            if (histIdx < 0) return
            histIdx--
            line = histIdx < 0 ? (histIdx = -1, '') : history[histIdx]
            redrawLine()
            return
          default: {
            // Other escape sequences (arrows, Home, F-keys) would insert tails like "[D".
            if (data[0] === '\x1b') return
            // Also drops newlines from multi-line pastes.
            const clean = data.replace(/[\x00-\x1f\x7f]/g, '')
            if (clean) { line += clean; term.write(clean) }
          }
        }
      })
    })()

    return () => { disposed = true; ro?.disconnect(); xterm?.dispose(); fitRef.current = null; termRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="ide-xterm-container" />
}

const TerminalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="ide-instance-icon">
    <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 3.414l2.293 2.293L5 11.121 6.414 12.5l3.707-3.707L6.414 5.086z"/>
  </svg>
)

interface InstanceRowProps {
  group:    TerminalGroup
  active:   boolean
  onSelect: (id: number) => void
  onClose:  (id: number) => void
  onRename: (id: number, name: string) => void
}

function InstanceRow({ group, active, onSelect, onClose, onRename }: InstanceRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(group.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

  const commit = () => {
    const name = draft.trim()
    if (name && name !== group.name) onRename(group.id, name)
    setEditing(false)
  }

  return (
    <div
      className={`ide-instance-item${active ? ' active' : ''}`}
      onClick={() => onSelect(group.id)}
    >
      <TerminalIcon />
      {editing ? (
        <input
          ref={inputRef}
          className="ide-instance-rename"
          value={draft}
          onClick={e => e.stopPropagation()}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') { setDraft(group.name); setEditing(false) }
            e.stopPropagation()
          }}
        />
      ) : (
        <span
          className="ide-instance-label"
          onDoubleClick={e => { e.stopPropagation(); setDraft(group.name); setEditing(true) }}
          title="Double-click to rename"
        >
          {group.name}{group.panes.length > 1 ? ` (${group.panes.length})` : ''}
        </span>
      )}
      <button
        className="ide-instance-close"
        onClick={e => { e.stopPropagation(); onClose(group.id) }}
        aria-label={`Kill ${group.name}`}
        title="Kill terminal"
      >×</button>
    </div>
  )
}

export interface TerminalViewProps extends TerminalData {
  groups:      TerminalGroup[]
  activeId:    number | null
  isActive:    boolean
  onAdd:       () => void
  onSelect:    (id: number) => void
  onClose:     (id: number) => void
  onRename:    (id: number, name: string) => void
  onClosePane: (groupId: number, paneId: number) => void
  themeVars:   ThemeVars
  fontSize:    number
}

export default function TerminalView({ groups, activeId, isActive, onAdd, onSelect, onClose, onRename, onClosePane, repos, stack, commits, fileTree, files, onOpenFile, chat, themeVars, fontSize }: TerminalViewProps) {
  return (
    <div className="ide-terminal-wrapper">
      <div className="ide-terminal-stack">
        {groups.length === 0 && (
          <div className="ide-bottom-empty">
            No active terminal. Click <span className="ide-kbd">+</span> to create one.
          </div>
        )}
        {groups.map(group => (
          <div
            key={group.id}
            className="ide-terminal-split"
            style={{ display: activeId === group.id ? 'flex' : 'none' }}
          >
            {group.panes.map(paneId => (
              <div key={paneId} className="ide-terminal-pane">
                {group.panes.length > 1 && (
                  <button
                    className="ide-pane-close"
                    onClick={() => onClosePane(group.id, paneId)}
                    aria-label="Close split pane"
                    title="Close split pane"
                  >×</button>
                )}
                <XTermPane
                  repos={repos} stack={stack} commits={commits} fileTree={fileTree}
                  files={files} onOpenFile={onOpenFile} chat={chat}
                  isActive={isActive && activeId === group.id}
                  themeVars={themeVars}
                  fontSize={fontSize}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="ide-instances-panel">
        <div className="ide-instances-header">
          <span>Instances</span>
          <button className="ide-instances-add" onClick={onAdd} aria-label="New terminal" title="New terminal (fish)">+</button>
        </div>
        <div className="ide-instances-list">
          {groups.map(group => (
            <InstanceRow
              key={group.id}
              group={group}
              active={activeId === group.id}
              onSelect={onSelect}
              onClose={onClose}
              onRename={onRename}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
