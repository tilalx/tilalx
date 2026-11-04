'use client'

import { Codicon } from '../icons'
import { useWorkbench, useIsMac } from '../context'
import type { ViewId } from '../context'
import { keyLabel } from '../keybinding'

const VIEWS: { id: ViewId; icon: string; title: string; key: string }[] = [
  { id: 'explorer',   icon: 'files',          title: 'Explorer',        key: 'Cmd+Shift+E' },
  { id: 'search',     icon: 'search',         title: 'Search',          key: 'Cmd+Shift+F' },
  { id: 'scm',        icon: 'source-control', title: 'Source Control',  key: 'Ctrl+Shift+G' },
  { id: 'run',        icon: 'debug-alt',      title: 'Run and Debug',   key: 'Cmd+Shift+D' },
  { id: 'extensions', icon: 'extensions',     title: 'Extensions',      key: 'Cmd+Shift+X' },
]

export default function ActivityBar({ onMenu, onAccounts, onManage }: {
  onMenu(e: React.MouseEvent): void; onAccounts(e: React.MouseEvent): void; onManage(e: React.MouseEvent): void
}) {
  const wb  = useWorkbench()
  const mac = useIsMac()
  const changes = Object.keys(wb.data.git).length

  return (
    <nav className="activitybar" aria-label="Active View Switcher">
      <div>
        <div className="menubar">
          <button className="action-label" title="Application Menu" onClick={onMenu}><Codicon name="menu" /></button>
        </div>
        {VIEWS.map(v => {
          const checked = wb.sidebar.visible && wb.sidebar.view === v.id
          return (
            <button
              key={v.id}
              className={`activity-item${checked ? ' checked' : ''}`}
              title={`${v.title} (${keyLabel(v.key, mac)})`}
              aria-pressed={checked}
              onClick={() => wb.showView(v.id, true)}
            >
              <Codicon name={v.icon} />
              {v.id === 'scm' && changes > 0 && <span className="activity-badge">{changes}</span>}
            </button>
          )
        })}
      </div>
      <div>
        <button className="activity-item" title="Accounts" onClick={onAccounts}><Codicon name="account" /></button>
        <button className="activity-item" title="Manage" onClick={onManage}><Codicon name="settings-gear" /></button>
      </div>
    </nav>
  )
}
