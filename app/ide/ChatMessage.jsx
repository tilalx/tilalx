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
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const lang = match ? match[1] : ''
            if (!inline && lang) {
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
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            }
            if (!inline) {
              // Fenced block without language
              return (
                <pre className="ide-chat-code-block" {...props}>
                  <code>{children}</code>
                </pre>
              )
            }
            return <code className="ide-chat-inline-code" {...props}>{children}</code>
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
