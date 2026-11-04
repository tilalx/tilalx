'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useWorkbench, useIsMac } from '../context'
import type { QuickMode } from '../context'
import { COMMANDS, commandLabel } from '../commands'
import { activeTabOf } from '../editors/model'
import { tabTitle, TabIcon } from '../editors/EditorPart'
import { fuzzyMatch, Highlighted } from '../fuzzy'
import { Codicon, FileIcon } from '../icons'
import { keyParts } from '../keybinding'
import { basename } from '../languages'
import { parseSymbols } from '../symbols'
import { THEMES } from '../theme'
import type { ThemeId } from '../theme'
import type { FileNode } from '../types'

interface Item {
  id: string
  label: string
  indices?: number[]
  description?: string
  icon?: ReactNode
  keybinding?: string
  group?: string
  run(): void
}

const recentCommands: string[] = []

function flatten(nodes: FileNode[]): string[] {
  return nodes.flatMap(n => n.type === 'folder' ? flatten(n.children ?? []) : [n.path])
}

function modeOf(value: string, fallback: QuickMode): QuickMode {
  if (fallback === 'themes') return 'themes'
  if (value.startsWith('>')) return 'commands'
  if (value.startsWith('@')) return 'symbols'
  if (value.startsWith(':')) return 'line'
  return 'files'
}

export default function QuickInput({ mode: initialMode, initialValue, onClose }: { mode: QuickMode; initialValue: string; onClose(): void }) {
  const wb  = useWorkbench()
  const mac = useIsMac()
  const [value, setValue] = useState(initialMode === 'commands' && !initialValue.startsWith('>') ? `>${initialValue}` : initialValue)
  const [focus, setFocus] = useState(() => initialMode === 'themes' ? Math.max(0, Object.keys(THEMES).indexOf(wb.theme.id)) : 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const originalTheme = useRef(wb.theme.id)
  const mode  = modeOf(value, initialMode)
  const light = wb.theme.type === 'light'

  useEffect(() => { inputRef.current?.focus() }, [])
  const typed = useRef(value)
  useEffect(() => { if (typed.current !== value) { typed.current = value; setFocus(0) } }, [value])

  const active = activeTabOf(wb.editors)
  const activePath = active?.input.type === 'file' ? active.input.path : null

  const items: Item[] = useMemo(() => {
    const close = (fn: () => void) => () => { onClose(); fn() }

    if (mode === 'commands') {
      const q = value.slice(1).trim()
      const available = COMMANDS.filter(c => !c.hidden && (!c.when || c.when(wb)))
      const scored = available
        .map(c => ({ c, m: fuzzyMatch(q, commandLabel(c)) }))
        .filter(x => x.m)
        .sort((a, b) => q ? b.m!.score - a.m!.score : commandLabel(a.c).localeCompare(commandLabel(b.c)))
      const recent = q ? [] : recentCommands.flatMap(id => scored.filter(x => x.c.id === id))
      const rest   = scored.filter(x => !recent.includes(x))
      return [...recent, ...rest].map((x, i): Item => ({
        id: x.c.id,
        label: commandLabel(x.c),
        indices: x.m!.indices,
        keybinding: x.c.key,
        group: recent.length && i === 0 ? 'recently used' : recent.length && i === recent.length ? 'other commands' : undefined,
        run: close(() => {
          const at = recentCommands.indexOf(x.c.id)
          if (at >= 0) recentCommands.splice(at, 1)
          recentCommands.unshift(x.c.id)
          x.c.run(wb)
        }),
      }))
    }

    if (mode === 'symbols') {
      if (!activePath) return []
      const text = wb.fileText(activePath) ?? ''
      const q = value.slice(1).trim()
      return parseSymbols(activePath, text)
        .map(s => ({ s, m: fuzzyMatch(q, s.name) }))
        .filter(x => x.m)
        .map(({ s, m }) => ({
          id: `${s.line}`, label: s.name, indices: m!.indices,
          icon: <Codicon name={s.kind} className={`symbol-icon ${s.kind}`} />,
          run: close(() => wb.reveal(activePath, s.line)),
        }))
    }

    if (mode === 'line') {
      if (!activePath) return []
      const lines = (wb.fileText(activePath) ?? '').split('\n').length
      const n = parseInt(value.slice(1), 10)
      const label = Number.isFinite(n) && n > 0
        ? `Go to line ${Math.min(n, lines)}.`
        : `Current Line: ${wb.cursor.line}, Character: ${wb.cursor.column}. Type a line number between 1 and ${lines} to navigate to.`
      return [{ id: 'line', label, run: close(() => { if (n > 0) wb.reveal(activePath, Math.min(n, lines)) }) }]
    }

    if (mode === 'themes') {
      return (Object.keys(THEMES) as ThemeId[]).map((id, i) => ({
        id, label: THEMES[id].label, indices: fuzzyMatch(value, THEMES[id].label)?.indices,
        group: i === 0 ? `${THEMES[id].type} themes` : THEMES[id].type !== THEMES[(Object.keys(THEMES) as ThemeId[])[i - 1]].type ? `${THEMES[id].type} themes` : undefined,
        run: () => { wb.setTheme(id); originalTheme.current = id; onClose() },
      })).filter(it => fuzzyMatch(value, it.label))
    }

    const withLine = /^(.+):(\d*)$/.exec(value.trim())
    const q    = withLine ? withLine[1] : value.trim()
    const line = withLine ? parseInt(withLine[2], 10) || undefined : undefined
    const recent: Item[] = q ? [] : wb.editors.groups.flatMap(g => g.mru.map(id => g.tabs.find(t => t.id === id)!)).filter(Boolean)
      .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
      .map((t, i): Item => ({
        id: t.id,
        label: tabTitle(t.input),
        description: t.input.type === 'file' || t.input.type === 'preview' ? t.input.path.split('/').slice(0, -1).join('/') : undefined,
        icon: <TabIcon input={t.input} light={light} />,
        group: i === 0 ? 'recently opened' : undefined,
        run: close(() => wb.open(t.input)),
      }))
    const files = flatten(wb.data.tree)
      .map(p => ({ p, m: fuzzyMatch(q, basename(p)) ?? (q.includes('/') ? fuzzyMatch(q, p) : null) }))
      .filter(x => x.m)
      .sort((a, b) => b.m!.score - a.m!.score)
      .filter(x => !recent.some(r => r.id === `file:${x.p}`))
      .slice(0, 60)
      .map((x, i): Item => ({
        id: `file:${x.p}`,
        label: basename(x.p),
        indices: fuzzyMatch(q, basename(x.p))?.indices ?? [],
        description: x.p.split('/').slice(0, -1).join('/'),
        icon: <FileIcon path={x.p} light={light} />,
        group: !q && i === 0 ? 'files' : undefined,
        run: close(() => line ? wb.reveal(x.p, line) : wb.open({ type: 'file', path: x.p })),
      }))
    return [...recent, ...files]
  }, [mode, value, wb, onClose, activePath, light])

  const focusedId = items[focus]?.id
  useEffect(() => {
    if (mode === 'themes' && focusedId && focusedId in THEMES && focusedId !== wb.theme.id) wb.setTheme(focusedId as ThemeId)
  }, [mode, focusedId, wb])

  const dismiss = () => {
    if (mode === 'themes' && wb.theme.id !== originalTheme.current) wb.setTheme(originalTheme.current)
    onClose()
  }

  useEffect(() => {
    listRef.current?.querySelector('.quick-row.focused')?.scrollIntoView({ block: 'nearest' })
  }, [focus])

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': setFocus(f => items.length ? (f + 1) % items.length : 0); break
      case 'ArrowUp':   setFocus(f => items.length ? (f - 1 + items.length) % items.length : 0); break
      case 'PageDown':  setFocus(f => Math.min(items.length - 1, f + 10)); break
      case 'PageUp':    setFocus(f => Math.max(0, f - 10)); break
      case 'Enter':     items[focus]?.run(); break
      case 'Escape':    dismiss(); break
      default: return
    }
    e.preventDefault(); e.stopPropagation()
  }

  const placeholder = {
    files:    'Search files by name (append : to go to line or @ to go to symbol)',
    commands: '',
    symbols:  activePath ? '' : 'To go to a symbol, first open a text editor with symbol information.',
    line:     '',
    themes:   'Select Color Theme (Up/Down Keys to Preview)',
  }[mode]

  const empty = mode === 'commands' ? 'No matching commands' : mode === 'symbols' ? (activePath ? 'No editor symbols' : '') : 'No matching results'

  return (
    <>
      <div className="quick-input-backdrop" onMouseDown={dismiss} />
      <div className="quick-input-widget" role="dialog" aria-label="Quick Input" onKeyDown={onKeyDown}>
        {mode === 'themes' && <div className="quick-input-title">Select Color Theme</div>}
        <div className="quick-input-header">
          <input
            ref={inputRef}
            className="quick-input-box"
            value={value}
            placeholder={placeholder}
            onChange={e => setValue(e.target.value)}
            aria-activedescendant={focusedId ? `qi-${focusedId}` : undefined}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="quick-input-list scrollable" ref={listRef} role="listbox">
          {items.length === 0 && empty && <div className="quick-row empty">{empty}</div>}
          {items.map((it, i) => (
            <div
              key={it.id}
              id={`qi-${it.id}`}
              role="option"
              aria-selected={i === focus}
              className={`quick-row${i === focus ? ' focused' : ''}${it.group && i > 0 ? ' separator' : ''}`}
              onMouseMove={() => i !== focus && setFocus(i)}
              onClick={() => it.run()}
            >
              {it.icon && <span className="quick-icon">{it.icon}</span>}
              <span className="quick-label"><Highlighted text={it.label} indices={it.indices ?? []} /></span>
              {it.description && <span className="quick-description">{it.description}</span>}
              <span className="quick-right">
                {it.group && <span className="quick-group">{it.group}</span>}
                {it.keybinding && (
                  <span className="keybinding">
                    {keyParts(it.keybinding, mac).map((stroke, si) => (
                      <span key={si} className="keybinding" style={si ? { marginLeft: 4 } : undefined}>
                        {stroke.map((k, ki) => <kbd key={ki}>{k}</kbd>)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
