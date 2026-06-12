'use client'

import { useEffect, useRef, useLayoutEffect, useState } from 'react'

// Lightweight right-click menu. Rendered fixed at (x,y); flips to stay on-screen.
// `items`: [{ label, onClick, disabled, danger, sep, hint }]. A `sep:true` entry
// renders a divider. Closes on outside-click, Esc, scroll, or blur.
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)
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
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
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
            className={`ide-context-item${it.danger ? ' danger' : ''}`}
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
