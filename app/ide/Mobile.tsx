import { TABS } from './constants'
import { IconSettings, FileIcon } from './icons'
import Sidebar from './Sidebar'
import type { FileNode, Repo, TabKind } from './types'

const IconPanel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M15 3v18"/>
  </svg>
)

export function MobileHeader({ activeTab, openFile, onDrawer, onSheet, onSettings }: {
  activeTab: string; openFile: string | null; onDrawer: () => void; onSheet: () => void; onSettings: () => void
}) {
  const tab = TABS.find(t => t.id === activeTab) || TABS[0]
  const label = openFile ? openFile.split('/').pop()! : tab.label
  return (
    <div className="ide-mobile-header">
      <button className="ide-mobile-icon-btn" onClick={onDrawer} aria-label="Explorer">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </button>
      <div className="ide-mobile-title">
        <FileIcon name={label} />
        {label}
      </div>
      <button className="ide-mobile-icon-btn" onClick={onSettings} aria-label="Settings"><IconSettings /></button>
      <button className="ide-mobile-icon-btn" onClick={onSheet} aria-label="Live Preview"><IconPanel /></button>
    </div>
  )
}

export function MobileNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: TabKind) => void }) {
  return (
    <nav className="ide-mobile-nav" aria-label="Tabs">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`ide-mobile-nav-btn${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="ide-mobile-nav-dot" style={{ background: tab.color }} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function Drawer({ open, onClose, activeTab, openFile, onTabChange, onOpenFile, repos, fileTree }: {
  open: boolean; onClose: () => void; activeTab: TabKind; openFile: string | null
  onTabChange: (id: TabKind) => void; onOpenFile: (file: string, line?: number | null) => void
  repos: Repo[]; fileTree: FileNode[]
}) {
  return (
    <>
      <div className={`ide-drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-drawer${open ? ' open' : ''}`} inert={!open}>
        <Sidebar
          activityView="explorer"
          activeTab={activeTab}
          openFile={openFile}
          onTabChange={id => { onTabChange(id); onClose() }}
          onOpenFile={(fp, ln) => { onOpenFile(fp, ln); onClose() }}
          repos={repos}
          fileTree={fileTree}
          stack={[]}
          commits={[]}
          commitsLoading={false}
          fileContents={null}
        />
      </div>
    </>
  )
}
