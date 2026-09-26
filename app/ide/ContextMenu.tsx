'use client'

import { useEffect, useRef, useLayoutEffect, useState } from 'react'

export interface ContextMenuItem {
  label?:    string
  onClick?:  () => void
  disabled?: boolean
  sep?:      boolean
  hint?:     string
}

export interface ContextMenuProps {
  x:       number
  y:       number
  items:   ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      left: Math.min(x, window.innerWidth - width - 6),
      top: Math.min(y, window.innerHeight - height - 6),
    })
  }, [x, y])

  useEffect(() => {
    const close = () => onClose()
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node | null)) onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
    }
  }, [onClose])

  return (
    <div className="ide-context-menu" ref={ref} style={{ left: pos.left, top: pos.top }} role="menu">
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="ide-context-sep" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className="ide-context-item"
            disabled={it.disabled}
            onClick={() => { it.onClick?.(); onClose() }}
          >
            <span>{it.label}</span>
            {it.hint && <span className="ide-context-hint">{it.hint}</span>}
          </button>
        )
      )}
    </div>
  )
}
