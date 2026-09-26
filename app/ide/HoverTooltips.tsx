'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Tip { text: string; x: number; y: number; above: boolean }

export default function HoverTooltips() {
  const [tip, setTip] = useState<Tip | null>(null)
  const [left, setLeft] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!tip || !ref.current) return
    const w = ref.current.offsetWidth
    setLeft(Math.max(8, Math.min(tip.x - w / 2, window.innerWidth - w - 8)))
  }, [tip])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: HTMLElement | null = null
    const hide = () => { clearTimeout(timer); current = null; setTip(null) }

    const onOver = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[title], [data-hover]') ?? null
      if (el === current) return
      hide()
      if (!el) return
      const title = el.getAttribute('title')
      // Moving `title` to data-hover suppresses the native tooltip.
      if (title !== null) {
        el.removeAttribute('title')
        if (!title) return
        el.dataset.hover = title
        if (!el.hasAttribute('aria-label') && !el.textContent?.trim()) el.setAttribute('aria-label', title)
      }
      const text = el.dataset.hover
      if (!text) return
      current = el
      timer = setTimeout(() => {
        const r = el.getBoundingClientRect()
        const above = r.bottom + 40 > window.innerHeight
        setTip({ text, x: r.left + r.width / 2, y: above ? r.top - 4 : r.bottom + 4, above })
      }, 500)
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mousedown', hide, true)
    document.addEventListener('keydown', hide, true)
    document.addEventListener('scroll', hide, true)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      hide()
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mousedown', hide, true)
      document.removeEventListener('keydown', hide, true)
      document.removeEventListener('scroll', hide, true)
      document.documentElement.removeEventListener('mouseleave', hide)
    }
  }, [])

  if (!tip) return null
  return (
    <div ref={ref} className={`ide-hover${tip.above ? ' above' : ''}`} role="tooltip" style={{ left, top: tip.y }}>
      {tip.text}
    </div>
  )
}
