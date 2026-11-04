'use client'

import { useIsMac } from './context'

const MAC_SYMBOLS: Record<string, string> = { Cmd: '⌘', Ctrl: '⌃', Shift: '⇧', Alt: '⌥', Enter: '↩', Up: '↑', Down: '↓', Left: '←', Right: '→', Backspace: '⌫', Escape: 'Esc' }

export function keyParts(binding: string, mac: boolean): string[][] {
  return binding.split(' ').map(stroke => stroke.split('+').map(k => {
    if (!mac && k === 'Cmd') return 'Ctrl'
    return mac ? MAC_SYMBOLS[k] ?? k.toUpperCase() : k.length === 1 ? k.toUpperCase() : k
  }))
}

export function keyLabel(binding: string, mac: boolean): string {
  return keyParts(binding, mac).map(s => s.join(mac ? '' : '+')).join(' ')
}

export function Keybinding({ binding }: { binding: string }) {
  const mac = useIsMac()
  return (
    <span className="keybinding">
      {keyParts(binding, mac).map((stroke, i) => (
        <span key={i} className="keybinding" style={i ? { marginLeft: 6 } : undefined}>
          {stroke.map((k, j) => <kbd key={j}>{k}</kbd>)}
        </span>
      ))}
    </span>
  )
}

const ARROWS: Record<string, string> = { Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown' }

export function matchesKey(e: KeyboardEvent, binding: string, mac: boolean): boolean {
  const parts = binding.split('+')
  const key   = parts.pop()!
  const want  = new Set(parts)
  const mods  = mac
    ? want.has('Cmd') === e.metaKey && want.has('Ctrl') === e.ctrlKey
    : (want.has('Cmd') || want.has('Ctrl')) === e.ctrlKey && !e.metaKey
  if (!mods || want.has('Shift') !== e.shiftKey || want.has('Alt') !== e.altKey) return false
  const code = e.code
  switch (key) {
    case '`':  return code === 'Backquote' || e.key === '`'
    case ',':  return code === 'Comma'
    case '-':  return code === 'Minus'
    case '\\': return code === 'Backslash' || e.key === '\\'
    case 'Tab': return e.key === 'Tab'
    case 'Escape': return e.key === 'Escape'
    case 'PageUp': case 'PageDown': return e.key === key
    case 'Left': case 'Right': case 'Up': case 'Down': return e.key === ARROWS[key]
    default:
      if (/^[A-Z]$/.test(key)) return code === `Key${key}`
      if (/^[0-9]$/.test(key)) return code === `Digit${key}`
      return e.key.toLowerCase() === key.toLowerCase()
  }
}
