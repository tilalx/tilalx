'use client'

import { useEffect, useRef } from 'react'

export interface MemesEditorProps {
  memeUrl:          string
  memeLoading:      boolean
  onNext:           () => void
  autoPlay:         boolean
  interval:         number
  onAutoPlayChange: (v: boolean) => void
  onIntervalChange: (v: number) => void
}

export default function MemesEditor({ memeUrl, memeLoading, onNext, autoPlay, interval, onAutoPlayChange, onIntervalChange }: MemesEditorProps) {
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    if (!autoPlay) return
    const id = setInterval(() => onNextRef.current(), Math.max(1, interval) * 1000)
    return () => clearInterval(id)
  }, [autoPlay, interval])

  const toggleAuto = () => {
    const next = !autoPlay
    if (next) onNextRef.current()
    onAutoPlayChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 14px', background: 'var(--ide-bg2)',
        borderBottom: '1px solid var(--ide-border)', flexShrink: 0,
        fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12,
      }}>
        <span style={{ color: '#6a9955' }}>{'// memes.feed'}</span>
        <div style={{ flex: 1 }} />
        <button className={`ide-meme-btn${autoPlay ? ' stop' : ''}`} onClick={toggleAuto}>
          {autoPlay ? '■ stop' : '▶ auto'}
        </button>
        {autoPlay && <>
          <span style={{ color: 'var(--ide-muted)' }}>every</span>
          <button className="ide-meme-btn" onClick={() => onIntervalChange(Math.max(1, interval - 1))}>▼</button>
          <span style={{ color: 'var(--ide-yellow)', minWidth: 26, textAlign: 'center' }}>{interval}s</span>
          <button className="ide-meme-btn" onClick={() => onIntervalChange(Math.min(60, interval + 1))}>▲</button>
        </>}
        <div style={{ width: 1, height: 16, background: 'var(--ide-border)', flexShrink: 0 }} />
        <button className="ide-meme-btn" onClick={onNext} disabled={memeLoading}>
          {memeLoading ? 'loading…' : 'next →'}
        </button>
        {autoPlay && <span className="ide-live-dot" />}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ide-bg3)', overflow: 'hidden' }}>
        {memeLoading ? (
          <div className="ide-skeleton" style={{ width: '55%', height: '55%', minHeight: 200, minWidth: 200, maxWidth: 500 }} />
        ) : memeUrl ? (
          <img src={memeUrl} alt="meme" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <span style={{ color: 'var(--ide-muted)', fontSize: 12, fontFamily: 'monospace' }}>{'// null — failed to load'}</span>
        )}
      </div>
    </div>
  )
}
