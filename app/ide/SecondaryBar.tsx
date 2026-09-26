'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'
import type { UseChatResult } from './useChat'

interface Skill { label: string; action?: 'meme' | 'quote'; prompt?: string }

const SKILLS: Skill[] = [
  { label: '🖼️ Meme',      action: 'meme' },
  { label: '💬 Quote',     action: 'quote' },
  { label: '🛠️ Stack',     prompt: "What is Tilo's tech stack?" },
  { label: '⌨️ Shortcuts', prompt: 'What are the most useful keyboard shortcuts in this editor?' },
]

export interface SecondaryBarProps {
  chat:    UseChatResult
  onClose: () => void
}

export default function SecondaryBar({ chat, onClose }: SecondaryBarProps) {
  const { status, progress, progressText, error, modelSize, modelName, messages, openFile, send, stop, clear, load, autoload, inject } = chat
  const [input, setInput] = useState('')
  const [skillBusy, setSkillBusy] = useState(false)
  const [withFile, setWithFile] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { autoload() }, [autoload])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const generating = status === 'generating' || status === 'fetching'
  const busy = status === 'loading' || generating || skillBusy

  const onSend = () => {
    const text = input.trim()
    if (!text || busy || status === 'unsupported') return
    setInput('')
    send(text, { withFile })
  }

  const handleSkill = async (skill: Skill) => {
    if (busy) return
    if (skill.prompt) { send(skill.prompt, { withFile }); return }

    setSkillBusy(true)
    try {
      if (skill.action === 'meme') {
        const res  = await fetch('https://meme-api.aelx.de/gimme')
        const data = await res.json()
        const url  = data.url || ''
        const sub  = data.subreddit ? `r/${data.subreddit}` : 'meme'
        const title = data.title ? ` — *${data.title}*` : ''
        inject('🖼️ Give me a meme', url ? `![meme](${url})\n${sub}${title}` : '⚠️ Could not load a meme right now.')
      } else if (skill.action === 'quote') {
        const res  = await fetch('https://quotes.aelx.de/random?count=1', { cache: 'no-store' })
        const data = await res.json()
        const q    = data?.[0]
        inject('💬 Give me a quote', q ? `> ${q.content}\n\n— **${q.author}**` : '⚠️ Could not load a quote right now.')
      }
    } catch {
      inject(skill.action === 'meme' ? '🖼️ Give me a meme' : '💬 Give me a quote', '⚠️ Request failed. Try again.')
    } finally {
      setSkillBusy(false)
    }
  }

  return (
    <div className="ide-secondary-bar">
      <div className="ide-secondary-head">
        <span>CHAT{modelName && <span style={{ opacity: 0.6, fontWeight: 400, letterSpacing: 0 }}> · {modelName}</span>}</span>
        <button className="ide-secondary-close" title="Clear chat" onClick={clear} disabled={generating} style={{ marginLeft: 'auto' }}>⌫</button>
        <button className="ide-secondary-close" title="Hide Secondary Side Bar (Ctrl+Alt+B)" onClick={onClose}>×</button>
      </div>

      <div className="ide-chat-list" ref={listRef}>
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          const streaming = generating && isLast && m.role === 'assistant'
          return (
            <div key={i} className={`ide-chat-msg ${m.role}`}>
              <span className="ide-chat-role">{m.role === 'user' ? 'you' : '🤖'}</span>
              <div className="ide-chat-msg-body">
                <ChatMessage text={m.text} role={m.role} streaming={streaming} />
                {streaming && !m.tool && <span className="ide-chat-caret" />}
                {m.tool && isLast && <div className="ide-chat-tool-call">{m.tool}…</div>}
              </div>
            </div>
          )
        })}
      </div>

      {status === 'unsupported' ? (
        <div className="ide-chat-notice">
          This chat runs a local AI model and needs WebGPU: Chrome, Edge, Safari 26+ or Firefox 141+.
        </div>
      ) : status === 'loading' ? (
        <div className="ide-chat-loading">
          <div className="ide-chat-progress"><div className="ide-chat-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <div className="ide-chat-progress-text">{progressText || 'Loading model…'}</div>
        </div>
      ) : status === 'idle' || status === 'error' ? (
        <div className="ide-chat-loading">
          {status === 'error' && <div className="ide-chat-notice ide-chat-notice-error">{error || 'Failed to load the model.'}</div>}
          <div className="ide-chat-skills ide-chat-skills-inline">
            <button className="ide-chat-skill-btn" onClick={() => handleSkill(SKILLS[0])}>{SKILLS[0].label}</button>
            <button className="ide-chat-skill-btn" onClick={() => handleSkill(SKILLS[1])}>{SKILLS[1].label}</button>
          </div>
          <button className="ide-chat-load-btn" onClick={() => load()}>
            ⚡ {status === 'error' ? 'Retry loading AI model' : 'Load AI model'} <span className="ide-chat-load-sub">({modelSize})</span>
          </button>
        </div>
      ) : (
        <>
          {!busy && (
            <div className="ide-chat-skills">
              {SKILLS.map(s => (
                <button key={s.label} className="ide-chat-skill-btn" onClick={() => handleSkill(s)}>{s.label}</button>
              ))}
            </div>
          )}
          {status === 'sleeping' && (
            <div className="ide-chat-fetching-bar">💤 Model unloaded to free memory — it reloads on your next message.</div>
          )}
          {openFile && (
            <div className="ide-chat-skills">
              <button className="ide-chat-skill-btn" onClick={() => setWithFile(w => !w)} title="Include the open file as context"
                style={withFile ? { borderColor: 'var(--ide-accent)', color: 'var(--ide-fg)' } : { opacity: 0.6, textDecoration: 'line-through' }}>
                📎 {openFile.split('/').pop()}
              </button>
            </div>
          )}
          <div className="ide-chat-input-row">
            <textarea
              className="ide-chat-input"
              placeholder={busy ? 'Generating…' : 'Ask about Tilo…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
              rows={2}
              disabled={busy}
            />
            {generating
              ? <button className="ide-chat-send" onClick={stop}>Stop</button>
              : <button className="ide-chat-send" onClick={onSend} disabled={!input.trim() || busy}>Send</button>}
          </div>
        </>
      )}
    </div>
  )
}
