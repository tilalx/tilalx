'use client'

import { useMemo, useEffect, useRef } from 'react'
import { syntaxHighlight } from './syntax'

function LineNumbers({ count }) {
  return (
    <div className="ide-line-numbers">
      {Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  )
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'ico', 'gif'])

export default function CodeViewer({ filename, content, scrollToLine }) {
  const highlightRef = useRef(null)

  const ext = useMemo(() => {
    const name = (filename || '').split('/').pop()
    if (name === 'Dockerfile') return 'dock'
    if (name === '.gitignore') return 'git'
    return name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  }, [filename])

  const isSvg    = ext === 'svg'
  const isImage  = IMAGE_EXTS.has(ext)
  const publicUrl = filename?.startsWith('public/') ? `/${filename.slice(7)}` : null

  const svgDataUrl = useMemo(() => {
    if (!isSvg || !content) return null
    try { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}` } catch { return null }
  }, [isSvg, content])

  const highlightedLines = useMemo(() => {
    if (isImage) return []
    return syntaxHighlight(content || '', ext).split('\n')
  }, [content, ext, isImage])

  useEffect(() => {
    if (scrollToLine && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollToLine, filename])

  const imgSrc = isImage ? publicUrl : (isSvg ? (publicUrl || svgDataUrl) : null)

  return (
    <div className="ide-code-scroll">
      {imgSrc && (
        <div className="ide-image-preview">
          <img src={imgSrc} alt={filename} className="ide-preview-img" />
        </div>
      )}
      {!isImage && (
        <pre className="ide-code-body">
          {highlightedLines.map((hlLine, i) => {
            const isHighlight = scrollToLine === i + 1
            return (
              <div
                key={i}
                ref={isHighlight ? highlightRef : null}
                className={`ide-code-row${isHighlight ? ' highlight' : ''}`}
              >
                <span className="ide-line-num">{i + 1}</span>
                <span className="ide-line-code" dangerouslySetInnerHTML={{ __html: hlLine || ' ' }} />
              </div>
            )
          })}
        </pre>
      )}
    </div>
  )
}

export { LineNumbers }
