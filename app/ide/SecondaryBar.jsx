'use client'

import { useState, useRef, useEffect } from 'react'
import ChatMessage from './ChatMessage'

const SKILLS = [
  { label: '🖼️ Meme',      action: 'meme' },
  { label: '💬 Quote',     action: 'quote' },
  { label: '🛠️ Stack',     prompt: "What is Tilo's tech stack?" },
  { label: '⌨️ Shortcuts', prompt: 'What are the most useful keyboard shortcuts in this editor?' },
]

export default function SecondaryBar({ chat, onClose }) {
  const { status, progress, progressText, error, messages, send, load, inject } = chat
  const [input, setInput] = useState('')
  const [skillBusy, setSkillBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const busy = status === 'loading' || status === 'generating' || status === 'fetching' || skillBusy

  const onSend = () => {
    const text = input.trim()
    if (!text || busy || status === 'unsupported') return
    setInput('')
    send(text)
  }

  const handleSkill = async (skill) => {
    if (busy) return
    if (skill.prompt) { send(skill.prompt); return }

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
        <span>CHAT</span>
        <button className="ide-secondary-close" title="Hide Secondary Side Bar (Ctrl+Alt+B)" onClick={onClose}>×</button>
      </div>

      <div className="ide-chat-list" ref={listRef}>
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1
          const streaming = status === 'generating' && isLast && m.role === 'assistant'
          const fetching = m.fetching && isLast
          return (
            <div key={i} className={`ide-chat-msg ${m.role}`}>
              <span className="ide-chat-role">{m.role === 'user' ? 'you' : '🤖'}</span>
              <div className="ide-chat-msg-body">
                <ChatMessage text={m.text} role={m.role} />
                {streaming && <span className="ide-chat-caret" />}
                {fetching && (
                  <div className="ide-chat-tool-call">🔍 Fetching <span className="ide-chat-tool-url">{m.fetching}</span>…</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {status === 'unsupported' ? (
        <div className="ide-chat-notice">
          This chat runs a local AI model and needs a WebGPU-capable browser. Try the latest Chrome or Edge.
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
            ⚡ {status === 'error' ? 'Retry loading AI model' : 'Load AI model'} <span className="ide-chat-load-sub">(~1&nbsp;GB, one-time)</span>
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
          {status === 'fetching' && (
            <div className="ide-chat-fetching-bar">🔍 Fetching data…</div>
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
            <button className="ide-chat-send" onClick={onSend} disabled={!input.trim() || busy}>Send</button>
          </div>
        </>
      )}
    </div>
  )
}
