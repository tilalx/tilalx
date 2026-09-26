import { useEffect, useState } from 'react'
import { getFileType } from './utils'
import { IconRemote, IconError, IconWarning, IconBell } from './icons'
import type { Problem } from './types'

export interface StatusBarProps {
  tab:            string
  openFile:       string | null
  problems:       Problem[]
  cursor:         { line: number; col: number } | null | undefined
  indent:         string | null
  onOpenGit:      () => void
  onOpenProblems: () => void
  onGotoLine:     () => void
  onCycleTab:     () => void
}

export default function StatusBar({ tab, openFile, problems, cursor, indent, onOpenGit, onOpenProblems, onGotoLine, onCycleTab }: StatusBarProps) {
  const fileType = getFileType(tab, openFile)
  const errors   = problems.filter(p => p.severity === 'error').length
  const warnings = problems.filter(p => p.severity === 'warning').length

  const [clock, setClock] = useState('')
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    tick()
    let iv: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => { tick(); iv = setInterval(tick, 60000) }, 60000 - (Date.now() % 60000))
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [])

  return (
    <div className="ide-status-bar">
      <div className="ide-status-left">
        <a
          href="https://github.com/tilalx/tilalx"
          target="_blank" rel="noopener noreferrer"
          className="ide-status-item ide-status-remote"
          title="Open Remote Repository"
          aria-label="Open Remote Repository"
        >
          <IconRemote />
        </a>
        <div className="ide-status-item ide-status-clickable" onClick={onOpenGit} title="tilalx (Git) - main">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M6 9v6M15 18H9"/>
          </svg>
          main
        </div>
        <div className="ide-status-item ide-status-clickable" onClick={onOpenGit} title="Synchronize Changes">↻ 0↓ 0↑</div>
        <div className="ide-status-item ide-status-clickable" onClick={onOpenProblems} title={`Errors: ${errors}, Warnings: ${warnings}`}>
          <IconError /> {errors} <IconWarning /> {warnings}
        </div>
      </div>
      <div className="ide-status-right">
        {openFile && cursor && (
          <div className="ide-status-item ide-status-clickable" onClick={onGotoLine} title="Go to Line/Column">Ln {cursor.line}, Col {cursor.col}</div>
        )}
        {openFile && indent && (
          <div className="ide-status-item ide-status-clickable" title="Select Indentation">{indent}</div>
        )}
        <div className="ide-status-item ide-status-clickable" title="Select Encoding">UTF-8</div>
        <div className="ide-status-item ide-status-clickable" title="Select End of Line Sequence">LF</div>
        <div className="ide-status-item ide-status-clickable" onClick={onCycleTab} title="Select Language Mode">{fileType}</div>
        <div className="ide-status-item" title="Local time">{clock}</div>
        <div className="ide-status-item ide-status-clickable" title="No Notifications" aria-label="Notifications"><IconBell /></div>
      </div>
    </div>
  )
}
