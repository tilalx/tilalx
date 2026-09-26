'use client'

import { memo, type ReactElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export interface ChatMessageProps {
  text: string
  role: 'user' | 'assistant'
  streaming?: boolean
}

export default memo(function ChatMessage({ text, role, streaming }: ChatMessageProps) {
  // Markdown + Prism on every token janks the main thread.
  if (role === 'user' || streaming) {
    return <span className={`ide-chat-text ide-chat-text-${role}`} style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
  }

  return (
    <div className="ide-chat-text ide-chat-text-assistant">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // react-markdown 9+ has no `inline` prop; only fenced blocks come wrapped in <pre>.
          pre({ children }) {
            const code = (children as ReactElement<{ className?: string; children?: unknown }> | undefined)?.props || {}
            const lang = /language-(\w+)/.exec(code.className || '')?.[1]
            const text = String(code.children ?? '').replace(/\n$/, '')
            if (lang) {
              return (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={lang}
                  PreTag="div"
                  className="ide-chat-code-block"
                  customStyle={{
                    margin: '6px 0',
                    borderRadius: 6,
                    fontSize: 12,
                    border: '1px solid var(--ide-border)',
                    background: 'var(--ide-bg3)',
                  }}
                >
                  {text}
                </SyntaxHighlighter>
              )
            }
            return <pre className="ide-chat-code-block"><code>{text}</code></pre>
          },
          code({ children }) {
            return <code className="ide-chat-inline-code">{children}</code>
          },
          p({ children }) {
            return <p className="ide-chat-p">{children}</p>
          },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="ide-chat-link">{children}</a>
          },
          img({ src, alt }) {
            return <img src={src} alt={alt || ''} className="ide-chat-img" />
          },
        }}
      >
        {text || ''}
      </ReactMarkdown>
    </div>
  )
})
