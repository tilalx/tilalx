'use client'

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { parseSymbols } from './symbols'
import { FileIcon } from './icons'
import type { FileNode, Tab, TabKind } from './types'

function levelsFor(tree: FileNode[] | undefined, segments: string[]) {
  const res: { items: FileNode[]; chosen: string }[] = []
  let cur = tree || []
  for (let i = 0; i < segments.length; i++) {
    res.push({ items: cur, chosen: segments[i] })
    const node = cur.find(n => n.name === segments[i])
    cur = node?.children || []
  }
  return res
}

interface CrumbItem { label: string; icon: ReactNode; disabled?: boolean; onClick?: () => void }
interface CrumbProps { label: string; items: CrumbItem[]; onPick?: () => void; isLast: boolean }

function Crumb({ label, items, onPick, isLast }: CrumbProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <span className="ide-bc-crumb" ref={ref}>
      <button className={`ide-bc-seg${isLast ? ' active' : ''}`} onClick={() => setOpen(o => !o)}>{label}</button>
      {open && items.length > 0 && (
        <div className="ide-bc-dropdown" role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              className={`ide-bc-item${it.disabled ? ' disabled' : ''}`}
              disabled={it.disabled}
              onClick={() => { it.onClick?.(); setOpen(false) }}
            >
              {it.icon}
              <span className="ide-bc-item-label">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </span>
  )
}

interface BreadcrumbProps {
  tab?:          Tab | null
  fileTree?:     FileNode[]
  fileContents?: Record<string, string> | null
  onOpenFile:    (file: string, line: number | null, opts: { preview: boolean }) => void
  onOpenKind?:   (kind: TabKind) => void
  fixedLabel:    string
}

export default function Breadcrumb({ tab, fileTree, fileContents, onOpenFile, onOpenKind, fixedLabel }: BreadcrumbProps) {
  const isFile = tab?.kind === 'file'
  const segments = isFile ? tab.file!.split('/') : []

  const levels = useMemo(() => isFile ? levelsFor(fileTree, segments) : [], [isFile, fileTree, tab?.file])
  const symbols = useMemo(() => isFile ? parseSymbols(tab.file!, fileContents?.[tab.file!] || '') : [], [isFile, tab?.file, fileContents])

  if (!isFile) {
    return (
      <div className="ide-breadcrumb">
        <span className="ide-bc-seg">tilalx</span>
        <span className="ide-breadcrumb-sep">›</span>
        <span className="ide-bc-seg active">{fixedLabel}</span>
      </div>
    )
  }

  const toItems = (level: { items: FileNode[] }): CrumbItem[] => level.items.map(n => ({
    label: n.name,
    icon: n.type === 'folder' ? null : <FileIcon name={n.name} />,
    disabled: n.type === 'folder',
    onClick: n.path ? () => onOpenFile(n.path!, null, { preview: false }) : undefined,
  }))

  return (
    <div className="ide-breadcrumb">
      {segments.map((seg, i) => (
        <span className="ide-bc-crumb-wrap" key={i}>
          {i > 0 && <span className="ide-breadcrumb-sep">›</span>}
          <Crumb label={seg} items={toItems(levels[i])} isLast={i === segments.length - 1 && symbols.length === 0} />
        </span>
      ))}
      {symbols.length > 0 && (
        <span className="ide-bc-crumb-wrap">
          <span className="ide-breadcrumb-sep">›</span>
          <Crumb
            label={symbols[0]?.name || 'symbols'}
            isLast
            items={symbols.map(s => ({
              label: s.name,
              icon: <span className="ide-bc-sym-kind">{(s.kind || 'sym').slice(0, 2)}</span>,
              onClick: () => onOpenFile(tab.file!, s.line, { preview: false }),
            }))}
          />
        </span>
      )}
    </div>
  )
}
