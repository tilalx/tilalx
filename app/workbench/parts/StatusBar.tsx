'use client'

import { pressable } from '../pressable'
import { Codicon } from '../icons'
import { useWorkbench } from '../context'
import { activeTabOf } from '../editors/model'
import { languageOf } from '../languages'

export default function StatusBar({ onBell }: { onBell(): void }) {
  const wb  = useWorkbench()
  const tab = activeTabOf(wb.editors)
  const path = tab?.input.type === 'file' ? tab.input.path : null
  const dirty = Object.keys(wb.data.git).length > 0
  const { line, column, selected } = wb.cursor

  return (
    <footer className="statusbar" aria-label="Status Bar">
      <div className="items left">
        <a className="statusbar-item remote" title="Open GitHub profile" href="https://github.com/tilalx" target="_blank" rel="noopener noreferrer">
          <Codicon name="remote" />
        </a>
        <div className="statusbar-item" title={`tilalx (Git) - ${wb.data.branch}${dirty ? ', Uncommitted Changes' : ''}`} {...pressable(() => wb.showView('scm'))}>
          <Codicon name="git-branch" />
          <span>{wb.data.branch}{dirty ? '*' : ''}</span>
        </div>
        <div className="statusbar-item" title="Synchronize Changes" {...pressable(() => wb.showView('scm'))}>
          <Codicon name="sync" />
        </div>
        <div className="statusbar-item" title="No Problems" {...pressable(() => wb.showPanel('problems'))}>
          <Codicon name="error" /><span>0</span>
          <Codicon name="warning" /><span>0</span>
        </div>
      </div>
      <div className="items right">
        {path && <>
          <div className="statusbar-item" title="Go to Line/Column" {...pressable(() => wb.quickInput('line', ':'))}>
            Ln {line}, Col {column}{selected > 0 ? ` (${selected} selected)` : ''}
          </div>
          <div className="statusbar-item" title="Select Indentation">Spaces: 2</div>
          <div className="statusbar-item" title="Select Encoding">UTF-8</div>
          <div className="statusbar-item" title="Select End of Line Sequence">LF</div>
          <div className="statusbar-item" title="Select Language Mode">
            <Codicon name="bracket" /><span>{languageOf(path).label}</span>
          </div>
        </>}
        <div className="statusbar-item" title="No Notifications" {...pressable(onBell)}>
          <Codicon name="bell" />
        </div>
      </div>
    </footer>
  )
}
