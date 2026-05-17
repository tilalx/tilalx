'use client'

import { getFileType } from './utils'

export default function StatusBar({ tab, openFile, repos, clock, onOpenGit, onOpenExplorer, setPanelTab, onCycleTab }) {
  const fileType = getFileType(tab, openFile)
  return (
    <div className="ide-status-bar">
      <div className="ide-status-left">
        <a
          href="https://github.com/tilalx/tilalx/tree/main"
          target="_blank" rel="noopener noreferrer"
          className="ide-status-item"
          style={{ background: 'rgba(0,0,0,0.2)', gap: 5, textDecoration: 'none', color: 'inherit' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M6 9v6M15 18H9"/>
          </svg>
          main
        </a>
        <div className="ide-status-item ide-status-clickable" onClick={onOpenGit} title="Open Source Control">↑0 ↓0</div>
        <div className="ide-status-item ide-status-clickable" style={{ color: '#a6e3a1' }} onClick={() => setPanelTab('preview')} title="Show Live Preview">● api ok</div>
        <div className="ide-status-item ide-status-clickable" onClick={onOpenExplorer} title="Show Explorer">{repos?.length ?? 0} repos</div>
      </div>
      <div className="ide-status-right">
        <div className="ide-status-item" title="Document Encoding: UTF-8">UTF-8</div>
        <div className="ide-status-item" title="End of Line: LF (Unix)">LF</div>
        <div className="ide-status-item ide-status-clickable" onClick={onCycleTab} title="Cycle editor tab">{fileType}</div>
        <div className="ide-status-item">Next.js</div>
        <div className="ide-status-sep" />
        <div className="ide-status-item">{clock}</div>
      </div>
    </div>
  )
}
