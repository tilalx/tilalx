'use client'

import { useMemo } from 'react'
import { Codicon } from '../icons'
import { pressable } from '../pressable'
import { useWorkbench } from '../context'
import { activeTabOf } from '../editors/model'
import { parseSymbols, symbolPath } from '../symbols'

export default function Outline() {
  const wb   = useWorkbench()
  const tab  = activeTabOf(wb.editors)
  const path = tab && (tab.input.type === 'file' || tab.input.type === 'preview') ? tab.input.path : null
  const text = path ? wb.fileText(path) : undefined
  const symbols = useMemo(() => path && text !== undefined ? parseSymbols(path, text) : [], [path, text])
  const current = symbolPath(symbols, wb.cursor.line).at(-1)

  if (!path) return <div className="pane-message">The active editor cannot provide outline information.</div>
  if (!symbols.length) return <div className="pane-message">No symbols found in document &apos;{path.split('/').pop()}&apos;</div>

  return (
    <div className="list" role="tree" aria-label="Outline">
      {symbols.map(s => (
        <div
          key={`${s.line}:${s.name}`}
          className={`list-row${s === current ? ' selected' : ''}`}
          style={{ paddingLeft: 4 + s.depth * 8 }}
          {...pressable(() => wb.reveal(path, s.line), 'treeitem')}
        >
          <span className="tree-lead file" />
          <span className="tree-label">
            <Codicon name={s.kind} className={`symbol-icon ${s.kind}`} style={{ marginRight: 6 }} />
            <span className="name">{s.name.replace(/^#+\s/, '')}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
