

import LivePreview, { type LivePreviewProps } from './LivePreview'

export interface PreviewSheetProps extends LivePreviewProps {
  open:    boolean
  onClose: () => void
}

export default function PreviewSheet({ open, onClose, ...preview }: PreviewSheetProps) {
  return (
    <>
      <div className={`ide-sheet-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-sheet${open ? ' open' : ''}`} inert={!open}>
        <div className="ide-sheet-handle-bar" style={{ position: 'relative' }}>
          <div className="ide-sheet-handle" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ide-fg)', marginLeft: 16 }}>LIVE PREVIEW</span>
          <button className="ide-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <LivePreview {...preview} />
      </div>
    </>
  )
}
