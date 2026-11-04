'use client'

import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useWorkbench } from '../context'

export default function MarkdownPreview({ path }: { path: string }) {
  const wb   = useWorkbench()
  const text = wb.fileText(path)
  useEffect(() => { if (text === undefined && !wb.fileFailed(path)) wb.loadFile(path) }, [path, text, wb])

  return (
    <div className={`markdown-preview scrollable vscode-${wb.theme.type}`}>
      <div className="markdown-body">
        {text !== undefined && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
