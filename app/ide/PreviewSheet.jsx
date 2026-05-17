'use client'

import LivePreview from './LivePreview'

export default function PreviewSheet({ open, onClose, memeUrl, memeLoading, quote, quoteLoading, networkLog, showLog }) {
  return (
    <>
      <div className={`ide-sheet-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`ide-sheet${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="ide-sheet-handle-bar" style={{ position: 'relative' }}>
          <div className="ide-sheet-handle" />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#cdd6f4', marginLeft: 16 }}>LIVE PREVIEW</span>
          <button className="ide-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <LivePreview memeUrl={memeUrl} memeLoading={memeLoading} quote={quote} quoteLoading={quoteLoading} networkLog={networkLog} showLog={showLog} />
      </div>
    </>
  )
}
