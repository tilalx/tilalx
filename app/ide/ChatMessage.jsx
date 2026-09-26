'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function ChatMessage({ text, role }) {
  if (role === 'user') {
    return <span className="ide-chat-text ide-chat-text-user">{text}</span>
  }

  return (
    <div className="ide-chat-text ide-chat-text-assistant">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // react-markdown >=9 has no `inline` prop: fenced blocks arrive wrapped
          // in <pre>, so blocks are rendered here and `code` alone is inline.
          pre({ children }) {
            const code = children?.props || {}
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
                    border: '1px solid #313244',
                    background: '#11111b',
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
}
