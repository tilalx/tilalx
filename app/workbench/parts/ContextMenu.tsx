'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useIsMac } from '../context'
import { keyLabel } from '../keybinding'
import { Codicon } from '../icons'

export type MenuItem =
  | { separator: true }
  | { separator?: false; label: string; key?: string; disabled?: boolean; checked?: boolean; submenuHint?: boolean; run(): void }

export interface MenuRequest {
  x: number
  y: number
  items: MenuItem[]
  anchorBottom?: boolean
}

export default function ContextMenu({ x, y, items, anchorBottom, onClose }: MenuRequest & { onClose(): void }) {
  const mac = useIsMac()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })
  const [focus, setFocus] = useState(-1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      left: Math.max(0, Math.min(x, window.innerWidth - width - 4)),
      top:  Math.max(0, anchorBottom ? y - height : Math.min(y, window.innerHeight - height - 4)),
    })
    el.focus()
  }, [x, y, anchorBottom])

  useEffect(() => {
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    window.addEventListener('mousedown', close, true)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('mousedown', close, true)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const actionable = items.map((it, i) => (!it.separator && !it.disabled ? i : -1)).filter(i => i >= 0)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = actionable.indexOf(focus)
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') setFocus(actionable[(at + 1) % actionable.length])
    else if (e.key === 'ArrowUp') setFocus(actionable[(at - 1 + actionable.length) % actionable.length])
    else if (e.key === 'Enter' && focus >= 0) { const it = items[focus]; if (!it.separator) { onClose(); it.run() } }
    else return
    e.preventDefault(); e.stopPropagation()
  }

  return (
    <div ref={ref} className="context-view monaco-menu" style={pos} role="menu" tabIndex={-1} onKeyDown={onKeyDown} onContextMenu={e => e.preventDefault()}>
      {items.map((it, i) => it.separator
        ? <div key={i} className="menu-separator" role="separator" />
        : (
          <div
            key={i}
            role="menuitem"
            aria-disabled={it.disabled}
            className={`menu-item${it.disabled ? ' disabled' : ''}${focus === i ? ' focused' : ''}`}
            onMouseEnter={() => !it.disabled && setFocus(i)}
            onMouseLeave={() => setFocus(-1)}
            onClick={() => { if (!it.disabled) { onClose(); it.run() } }}
          >
            <span className="menu-check">{it.checked && <Codicon name="check" />}</span>
            <span className="menu-label">{it.label}</span>
            {it.key && <span className="menu-keybinding">{keyLabel(it.key, mac)}</span>}
            {it.submenuHint && <Codicon name="chevron-right" className="menu-submenu" />}
          </div>
        ))}
    </div>
  )
}
