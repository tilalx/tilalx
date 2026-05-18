'use client'

import { useEffect, useRef } from 'react'

export default function MemesEditor({ memeUrl, memeLoading, onNext, autoPlay, interval, onAutoPlayChange, onIntervalChange }) {
  const intervalRef = useRef(null)
  const onNextRef   = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    if (autoPlay) {
      intervalRef.current = setInterval(() => onNextRef.current(), Math.max(1, interval) * 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
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
        padding: '6px 14px', background: '#181825',
        borderBottom: '1px solid #313244', flexShrink: 0,
        fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 12,
      }}>
        <span style={{ color: '#6a9955' }}>{'// memes.feed'}</span>
        <div style={{ flex: 1 }} />
        <button className={`ide-meme-btn${autoPlay ? ' stop' : ''}`} onClick={toggleAuto}>
          {autoPlay ? '■ stop' : '▶ auto'}
        </button>
        {autoPlay && <>
          <span style={{ color: '#6c7086' }}>every</span>
          <button className="ide-meme-btn" onClick={() => onIntervalChange(Math.max(1, interval - 1))}>▼</button>
          <span style={{ color: '#f9e2af', minWidth: 26, textAlign: 'center' }}>{interval}s</span>
          <button className="ide-meme-btn" onClick={() => onIntervalChange(interval + 1)}>▲</button>
        </>}
        <div style={{ width: 1, height: 16, background: '#313244', flexShrink: 0 }} />
        <button className="ide-meme-btn" onClick={onNext} disabled={memeLoading}>
          {memeLoading ? 'loading…' : 'next →'}
        </button>
        {autoPlay && <span className="ide-live-dot" />}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#11111b', overflow: 'hidden' }}>
        {memeLoading ? (
          <div className="ide-skeleton" style={{ width: '55%', height: '55%', minHeight: 200, minWidth: 200, maxWidth: 500 }} />
        ) : memeUrl ? (
          <img src={memeUrl} alt="meme" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <span style={{ color: '#6c7086', fontSize: 12, fontFamily: 'monospace' }}>{'// null — failed to load'}</span>
        )}
      </div>
    </div>
  )
}
