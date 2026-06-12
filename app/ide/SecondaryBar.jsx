'use client'

import { useState, useRef, useEffect } from 'react'

// A mock "Chat" view living in the secondary (right) side bar — VS Code ships its
// Chat panel here. This is a tongue-in-cheek "ask me about Tilo" assistant with
// canned, keyword-matched answers. Pure flair, no network.
const CANNED = [
  { match: ['stack', 'tech', 'language', 'framework'], reply: "Tilo works across the stack — TypeScript/React/Next.js on the front, Node, Python and Java on the back, all wired together with Docker, Terraform and Kubernetes." },
  { match: ['who', 'about', 'bio'], reply: "Tilo Alexander — software engineer who likes building polished developer tooling (this whole page is a VS Code clone, after all)." },
  { match: ['contact', 'email', 'reach', 'hire'], reply: "Reach out via GitHub (github.com/tilalx) or LinkedIn (linkedin.com/in/tilo-alexander)." },
  { match: ['project', 'repo', 'work'], reply: "Check the Source Control and Explorer views for live repositories pulled from GitHub — they update with real push dates." },
  { match: ['meme', 'fun'], reply: "Open memes.feed from the Explorer for a steady supply. The Live Preview panel mirrors it too." },
  { match: ['theme', 'color'], reply: "Try Ctrl+Shift+P → 'Color Theme'. Catppuccin Mocha, One Dark Pro, GitHub Dark and Tokyo Night are all here." },
  { match: ['help', 'shortcut', 'command'], reply: "Ctrl+P opens files, Ctrl+Shift+P the command palette, Ctrl+\\ splits the editor, Ctrl+K Z is Zen mode. Most VS Code muscle memory works." },
]
const DEFAULT_REPLY = "I only know a few things about Tilo — try asking about his stack, projects, contact, or the shortcuts in this editor."

function answer(text) {
  const q = text.toLowerCase()
  const hit = CANNED.find(c => c.match.some(m => q.includes(m)))
  return (hit || { reply: DEFAULT_REPLY }).reply
}

export default function SecondaryBar({ width, onResizeStart, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm a mock chat assistant. Ask me about Tilo's stack, projects, or how to drive this editor." },
  ])
  const [input, setInput] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setTimeout(() => setMessages(m => [...m, { role: 'assistant', text: answer(text) }]), 220)
  }

  return (
    <div className="ide-secondary-bar" style={{ width }}>
      <div className="ide-secondary-resize" onPointerDown={onResizeStart} role="separator" aria-orientation="vertical" aria-label="Resize secondary side bar" />
      <div className="ide-secondary-head">
        <span>CHAT</span>
        <button className="ide-secondary-close" title="Hide Secondary Side Bar (Ctrl+Alt+B)" onClick={onClose}>×</button>
      </div>
      <div className="ide-chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ide-chat-msg ${m.role}`}>
            <span className="ide-chat-role">{m.role === 'user' ? 'you' : '🤖'}</span>
            <span className="ide-chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="ide-chat-input-row">
        <textarea
          className="ide-chat-input"
          placeholder="Ask about Tilo…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          rows={2}
        />
        <button className="ide-chat-send" onClick={send} disabled={!input.trim()}>Send</button>
      </div>
    </div>
  )
}
