'use client'

import { useState } from 'react'
import ContextMenu from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'
import {
  IconArrowLeft, IconArrowRight, IconSearchSmall,
  IconLayoutSidebar, IconLayoutPanel, IconLayoutAux,
} from './icons'

export interface TitleMenu { label: string; items: ContextMenuItem[] }

export interface TitleBarProps {
  title:              string
  menus:              TitleMenu[]
  canGoBack:          boolean
  canGoForward:       boolean
  sidebarVisible:     boolean
  panelVisible:       boolean
  secondaryVisible:   boolean
  onCommandCenter:    () => void
  onBack:             () => void
  onForward:          () => void
  onToggleSidebar:    () => void
  onTogglePanel:      () => void
  onToggleSecondary:  () => void
}

export default function TitleBar(p: TitleBarProps) {
  const [open, setOpen] = useState<{ i: number; x: number; y: number } | null>(null)
  const show = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setOpen({ i, x: r.left, y: r.bottom })
  }
  return (
    <div className="ide-titlebar">
      <div className="ide-titlebar-left" role="menubar">
        <img src="/favicon.svg" alt="" width={16} height={16} className="ide-titlebar-logo" />
        {p.menus.map((m, i) => (
          <button
            key={m.label}
            className={`ide-menubar-item${open?.i === i ? ' open' : ''}`}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open?.i === i}
            onMouseDown={e => { e.stopPropagation(); if (open?.i === i) setOpen(null); else show(i, e.currentTarget) }}
            onMouseEnter={e => { if (open && open.i !== i) show(i, e.currentTarget) }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); show(i, e.currentTarget) } }}
          >{m.label}</button>
        ))}
        {open && (
          <ContextMenu
            key={open.i}
            x={open.x} y={open.y}
            items={p.menus[open.i].items}
            onClose={() => setOpen(null)}
          />
        )}
      </div>
      <div className="ide-titlebar-center">
        <button className="ide-title-btn" title="Go Back (Ctrl+Alt+-)" aria-label="Go Back" disabled={!p.canGoBack} onClick={p.onBack}><IconArrowLeft /></button>
        <button className="ide-title-btn" title="Go Forward (Ctrl+Shift+-)" aria-label="Go Forward" disabled={!p.canGoForward} onClick={p.onForward}><IconArrowRight /></button>
        <button className="ide-command-center" onClick={p.onCommandCenter} title="Search files (Ctrl+P)">
          <IconSearchSmall />
          <span>{p.title}</span>
        </button>
      </div>
      <div className="ide-titlebar-right">
        <button className={`ide-title-btn${p.sidebarVisible ? ' on' : ''}`} title="Toggle Primary Side Bar (Ctrl+B)" aria-pressed={p.sidebarVisible} onClick={p.onToggleSidebar}><IconLayoutSidebar on={p.sidebarVisible} /></button>
        <button className={`ide-title-btn${p.panelVisible ? ' on' : ''}`} title="Toggle Panel (Ctrl+J)" aria-pressed={p.panelVisible} onClick={p.onTogglePanel}><IconLayoutPanel on={p.panelVisible} /></button>
        <button className={`ide-title-btn${p.secondaryVisible ? ' on' : ''}`} title="Toggle Secondary Side Bar (Ctrl+Alt+B)" aria-pressed={p.secondaryVisible} onClick={p.onToggleSecondary}><IconLayoutAux on={p.secondaryVisible} /></button>
      </div>
    </div>
  )
}
