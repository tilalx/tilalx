'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'

export default function Sash({ orientation, style, size, min, max, invert = false, onChange, onReset, onCollapse }: {
  orientation: 'vertical' | 'horizontal'
  style?: CSSProperties
  size: number
  min: number
  max(): number
  invert?: boolean
  onChange(size: number): void
  onReset(): void
  onCollapse(): void
}) {
  const [active, setActive] = useState(false)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const start = orientation === 'vertical' ? e.clientX : e.clientY
    const startSize = size
    setActive(true)
    document.body.style.cursor = orientation === 'vertical' ? 'ew-resize' : 'ns-resize'

    const move = (ev: PointerEvent) => {
      const pos   = orientation === 'vertical' ? ev.clientX : ev.clientY
      const delta = (pos - start) * (invert ? -1 : 1)
      const next  = startSize + delta
      if (next < min / 2) { onCollapse(); up(); return }
      onChange(Math.max(min, Math.min(max(), next)))
    }
    const up = () => {
      setActive(false)
      document.body.style.cursor = ''
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  return (
    <div
      className={`sash ${orientation}${active ? ' active' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
    />
  )
}
