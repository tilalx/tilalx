'use client'

import { useEffect, useRef, useState } from 'react'
import { runTerminalCommand, COMMANDS } from './utils'

// ANSI palette stays constant; the base surface (background/foreground/cursor/
// selection) is derived from the active workbench theme vars so the terminal
// tracks the global theme switch instead of staying frozen on Catppuccin.
const ANSI = {
  black:        '#45475a', red:          '#f38ba8',
  green:        '#a6e3a1', yellow:       '#f9e2af',
  blue:         '#89b4fa', magenta:      '#cba6f7',
  cyan:         '#89dceb', white:        '#bac2de',
  brightBlack:  '#585b70', brightRed:    '#f38ba8',
  brightGreen:  '#a6e3a1', brightYellow: '#f9e2af',
  brightBlue:   '#89b4fa', brightMagenta:'#cba6f7',
  brightCyan:   '#89dceb', brightWhite:  '#a6adc8',
}

const buildTheme = (vars = {}) => ({
  ...ANSI,
  background:          vars['--ide-bg']  || '#1e1e2e',
  foreground:          vars['--ide-fg']  || '#cdd6f4',
  cursor:              vars['--ide-accent'] || '#f5c2e7',
  cursorAccent:        vars['--ide-bg']  || '#1e1e2e',
  selectionBackground: (vars['--ide-fg2'] || '#a6adc8') + '40',
})

const PS1_TOP = '\r\n\x1b[32mtilo@aelx\x1b[0m \x1b[34m~/Github/tilalx\x1b[0m \x1b[33m(main)\x1b[0m\r\n'
const PS1_BOT = '\x1b[36m>\x1b[0m '

const commonPrefix = (arr) => {
  if (!arr.length) return ''
  let prefix = arr[0]
  for (const s of arr) {
    while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1)
    if (!prefix) break
  }
  return prefix
}

const CLEAR_SCREEN = '\x1b[2J\x1b[3J\x1b[H' // clear viewport + scrollback + home

function XTermPane({ repos, stack, commits, fileTree, isActive, themeVars }) {
  const containerRef = useRef(null)
  const fitRef       = useRef(null)
  const termRef      = useRef(null)
  const reposRef     = useRef(repos)
  const stackRef     = useRef(stack)
  const commitsRef   = useRef(commits)
  const fileTreeRef  = useRef(fileTree)
  const themeRef     = useRef(themeVars)

  useEffect(() => { reposRef.current    = repos    }, [repos])
  useEffect(() => { stackRef.current    = stack    }, [stack])
  useEffect(() => { commitsRef.current  = commits  }, [commits])
  useEffect(() => { fileTreeRef.current = fileTree }, [fileTree])

  // Repaint the live terminal when the workbench theme changes.
  useEffect(() => {
    themeRef.current = themeVars
    if (termRef.current) termRef.current.options.theme = buildTheme(themeVars)
  }, [themeVars])

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
    let term, ro

    ;(async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ])

      term = new Terminal({
        theme: buildTheme(themeRef.current),
        fontFamily: '"JetBrains Mono", Consolas, "Courier New", monospace',
        fontSize: 13,
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
      let history = []
      let histIdx = -1

      const writePrompt = (fresh = false) => {
        term.write(fresh ? PS1_TOP.trimStart() + PS1_BOT : PS1_TOP + PS1_BOT)
      }

      // Redraw the current input line in place (used by history + completion).
      const redrawLine = () => term.write('\r\x1b[2K' + PS1_BOT + line)

      const runLine = () => {
        const cmd = line.trim()
        if (cmd) history = [cmd, ...history.slice(0, 49)]
        histIdx = -1
        term.writeln('')
        if (cmd) {
          const out = runTerminalCommand(cmd, {
            repos:    reposRef.current,
            stack:    stackRef.current,
            commits:  commitsRef.current,
            fileTree: fileTreeRef.current,
          })
          if (out === null) { term.write(CLEAR_SCREEN); writePrompt(true) }
          else              { out.forEach(l => term.writeln(l)); writePrompt() }
        } else {
          writePrompt()
        }
        line = ''
      }

      const complete = () => {
        if (!line.trim()) return
        const matches = COMMANDS.filter(cmd => cmd.startsWith(line))
        if (!matches.length) return
        if (matches.length === 1) {
          const rest = matches[0].slice(line.length)
          line += rest
          term.write(rest)
          return
        }
        const prefix = commonPrefix(matches)
        if (prefix.length > line.length) {
          const rest = prefix.slice(line.length)
          line += rest
          term.write(rest)
        } else {
          term.writeln('')
          term.writeln('\x1b[2m' + matches.join('  ') + '\x1b[0m')
          writePrompt()
          term.write(line)
        }
      }

      term.writeln('\x1b[32mWelcome to fish, the friendly interactive shell\x1b[0m')
      term.writeln('\x1b[2mType \x1b[0m\x1b[36mhelp\x1b[2m for instructions on how to use fish\x1b[0m')
      writePrompt(true)

      // Canonical REPL: onData delivers keystrokes AND pasted text, so paste,
      // history, completion and control keys all flow through one path.
      term.onData(data => {
        switch (data) {
          case '\r': // Enter
            runLine()
            return
          case '\x7f': // Backspace
          case '\b':
            if (line.length > 0) { line = line.slice(0, -1); term.write('\b \b') }
            return
          case '\t': // Tab — completion
            complete()
            return
          case '\x03': // Ctrl+C — abandon line
            term.write('^C')
            line = ''; histIdx = -1
            writePrompt()
            return
          case '\x0c': // Ctrl+L — clear screen, keep current input
            term.write(CLEAR_SCREEN)
            writePrompt(true)
            term.write(line)
            return
          case '\x15': // Ctrl+U — kill line
            line = ''
            term.write('\r\x1b[2K' + PS1_BOT)
            return
          case '\x1b[A': // Up — older history
            if (!history.length) return
            histIdx = Math.min(histIdx + 1, history.length - 1)
            line = history[histIdx]
            redrawLine()
            return
          case '\x1b[B': // Down — newer history
            histIdx--
            line = histIdx < 0 ? (histIdx = -1, '') : history[histIdx]
            redrawLine()
            return
          default: {
            // Printable input or pasted text. Strip control chars (incl. embedded
            // newlines from multi-line pastes) so a single line stays single-line.
            const clean = data.replace(/[\x00-\x1f\x7f]/g, '')
            if (clean) { line += clean; term.write(clean) }
          }
        }
      })
    })()

    return () => { ro?.disconnect(); term?.dispose(); fitRef.current = null; termRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="ide-xterm-container" />
}

const TerminalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="ide-instance-icon">
    <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 3.414l2.293 2.293L5 11.121 6.414 12.5l3.707-3.707L6.414 5.086z"/>
  </svg>
)

function InstanceRow({ group, active, onSelect, onClose, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(group.name)
  const inputRef = useRef(null)

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

// Container: manages the stack of terminal groups + the instances sidebar.
// Group/pane state lives in IDEApp so the bottom-panel action buttons can drive it.
// A group is a split: { id, name, panes: number[] } — panes render side-by-side.
export default function TerminalView({ groups, activeId, isActive, onAdd, onSelect, onClose, onRename, onClosePane, repos, stack, commits, fileTree, themeVars }) {
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
                  isActive={isActive && activeId === group.id}
                  themeVars={themeVars}
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
