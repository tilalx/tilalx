'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { findFile, grepFiles, resolvePath, toRegex, type Files } from './shell'
import { createEngine, isCached, nanoAvailable, pickModel, type Engine, type Msg } from './llm'

export type ChatStatus = 'idle' | 'unsupported' | 'loading' | 'ready' | 'sleeping' | 'generating' | 'fetching' | 'error'

export interface ChatMsg {
  role:  'user' | 'assistant'
  text:  string
  tool?: string
}

export interface ChatTools {
  files:      Files
  openFile:   string | null
  onOpenFile: (path: string, line?: number) => void
}

// ~3k tokens: prompt cost grows with length and Nano caps session size.
const CTX_CHARS  = 10_000
const TOOL_CHARS = 4_000
const MAX_TOKENS = 600
const IDLE_MS    = 10 * 60_000 // then unload to free VRAM
const STORE_KEY  = 'ide.chat'
const MAX_TOOL_ROUNDS = 3

const FACTS = `Facts about Tilo:
- Software engineer who builds polished developer tooling (this whole page is a VS Code clone he made).
- Stack: TypeScript / React / Next.js on the front end; Node, Python and Java on the back end; Docker, Terraform and Kubernetes for infra.
- Contact: GitHub github.com/tilalx, LinkedIn linkedin.com/in/tilo-alexander.
- His live projects/repos appear in the Source Control and Explorer views, with real push dates.`

const TILO_PERSONA = `You are the chat assistant in Tilo Alexander's portfolio, a web app styled as a VS Code clone. You are a small AI model running in the visitor's browser.

Answer questions about Tilo, this website's source code, and how to use this editor. Be concise and friendly. Use markdown: \`inline code\` for short snippets, fenced code blocks for multi-line code.

**Tools.** To use one, emit exactly one tag on its own line and stop; you will receive the result:
[READ: <file path>] — read a file of this website's source (e.g. [READ: app/page.tsx])
[SEARCH: <regex>] — search all source files, returns file:line matches
[OPEN: <file path>:<line>] — open a file in the editor for the user
[FETCH: <url>] — fetch a live web page (only for explicit web lookups)
Use tools only when needed. NEVER use them for memes or quotes — tell the user to use the 🖼️ Meme or 💬 Quote buttons below the chat.

${FACTS}

Using this editor:
- Ctrl+P opens files, Ctrl+Shift+P opens the command palette, Ctrl+\` toggles the terminal (try \`help\` there).
- Ctrl+\\ splits the editor, Ctrl+K Z is Zen mode. Most VS Code muscle memory works.
- Change the theme via Ctrl+Shift+P -> "Color Theme".`

const TERMINAL_PERSONA = `You answer questions inside a terminal in Tilo Alexander's portfolio website (a VS Code clone). You are a small local AI model. Reply in short plain text: no markdown headings, no tables, code only when it helps.

${FACTS}`

const GREETING = "Hi! I'm a small AI model running locally in your browser. Ask about Tilo, this site's source code (I can read and search it), or how to drive this editor."

const TOOL_RE = /\[(FETCH|READ|SEARCH|OPEN):\s*([^\]\n]+)\]/i

const clip = (s: string, n = TOOL_CHARS) => s.length > n ? s.slice(0, n) + `\n…(truncated, ${s.length - n} more chars)` : s

// The newest message is always kept, clipped if it alone is over budget.
function fit(msgs: Msg[]): Msg[] {
  const [sys, ...rest] = msgs
  let used = sys.content.length
  const kept: Msg[] = []
  for (let i = rest.length - 1; i >= 0; i--) {
    const m = rest[i]
    if (kept.length && used + m.content.length > CTX_CHARS) break
    kept.unshift(kept.length ? m : { ...m, content: clip(m.content, Math.max(500, CTX_CHARS - used)) })
    used += m.content.length
  }
  return [sys, ...kept]
}

async function runTool(name: string, arg: string, t: ChatTools): Promise<string> {
  if (name === 'READ') {
    const f = findFile(t.files, resolvePath('', arg))
    return f ? `[Content of ${f}:\n${clip(t.files[f])}]` : `[READ error: no file "${arg}". Use SEARCH to find paths.]`
  }
  if (name === 'SEARCH') {
    const hits = grepFiles(t.files, toRegex(arg, true), '', 30)
    return hits.length ? `[Search results for ${arg}:\n${clip(hits.map(h => `${h.file}:${h.line}: ${h.text}`).join('\n'))}]` : `[No matches for ${arg}]`
  }
  // FETCH
  try {
    const res  = await fetch('/api/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: arg }) })
    const data = await res.json()
    return data.error ? `[Fetch error for ${arg}: ${data.error}]` : `[Content of ${arg} (${data.contentType}):\n${clip(data.text)}]`
  } catch (e) {
    return `[Fetch failed for ${arg}: ${(e as Error).message}]`
  }
}

const TOOL_LABEL: Record<string, string> = { READ: '📄 Reading', SEARCH: '🔎 Searching', FETCH: '🔍 Fetching' }

export interface UseChatResult {
  status:       ChatStatus
  progress:     number
  progressText: string
  error:        string
  modelSize:    string
  modelName:    string
  messages:     ChatMsg[]
  openFile:     string | null
  send:         (text: string, opts?: { withFile?: boolean }) => Promise<void>
  complete:     (prompt: string, context: string | undefined, onToken: (delta: string) => void) => Promise<void>
  stop:         () => void
  clear:        () => void
  load:         () => Promise<Engine>
  autoload:     () => void
  inject:       (userText: string, assistantText: string) => void
}

export function useChat(tools: ChatTools): UseChatResult {
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [modelSize, setModelSize] = useState('~600 MB, one-time download')
  const [modelName, setModelName] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'assistant', text: GREETING }])

  const engineRef  = useRef<Engine | null>(null)
  const loadingRef = useRef<Promise<Engine> | null>(null)
  const genRef     = useRef(false) // one generation at a time: chat and terminal share the engine
  const stopRef    = useRef(false)
  const idleRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const toolsRef   = useRef(tools)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  toolsRef.current = tools

  const unload = useCallback((next: ChatStatus) => {
    clearTimeout(idleRef.current)
    engineRef.current?.dispose()
    engineRef.current = null
    loadingRef.current = null
    setStatus(next)
  }, [])

  const armIdle = useCallback(() => {
    clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => { if (!genRef.current) unload('sleeping') }, IDLE_MS)
  }, [unload])

  useEffect(() => () => unload('idle'), [unload])

  const load = useCallback(async () => {
    if (engineRef.current) return engineRef.current
    if (loadingRef.current) return loadingRef.current

    loadingRef.current = (async () => {
      setStatus('loading')
      setError('')
      setProgress(0)
      setProgressText('Preparing…')
      try {
        const engine = await createEngine((p, text) => { setProgress(p); setProgressText(text) })
        setModelName(engine.name)
        engineRef.current = engine
        setProgress(1)
        setStatus('ready')
        armIdle()
        return engine
      } catch (e) {
        console.error('LLM load failed', e)
        setError((e as Error | undefined)?.message || 'Failed to load the model.')
        unload('error')
        throw e
      }
    })()

    return loadingRef.current
  }, [armIdle, unload])

  useEffect(() => {
    ;(async () => {
      if (await nanoAvailable()) { setModelSize('built into Chrome, no download'); return }
      if (!navigator.gpu) { setStatus('unsupported'); return }
      const m = await pickModel()
      setModelSize(m.size)
      setModelName(m.label)
    })().catch(() => {})
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
      if (Array.isArray(saved) && saved.length) setMessages(saved)
    } catch {}
  }, [])
  useEffect(() => {
    if (status === 'generating' || status === 'fetching') return
    try { localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30).map(({ role, text }) => ({ role, text })))) } catch {}
  }, [messages, status])

  // Loads only if nothing needs downloading (Nano, or Qwen already cached).
  const autoload = useCallback(() => {
    if (engineRef.current || loadingRef.current) return
    ;(async () => {
      try {
        if (await nanoAvailable() || navigator.gpu && await isCached(await pickModel())) await load()
      } catch {}
    })()
  }, [load])

  const stop = useCallback(() => {
    stopRef.current = true
    engineRef.current?.stop()
  }, [])

  // onText gets the accumulated text, at most once per animation frame.
  const stream = async (engine: Engine, msgs: Msg[], onText: (acc: string) => void, temperature = 0.6) => {
    let acc = '', frame = 0
    await engine.generate(fit(msgs), delta => {
      acc += delta
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; onText(acc) })
    }, { temperature, maxTokens: MAX_TOKENS })
    cancelAnimationFrame(frame)
    onText(acc)
    return acc
  }

  const withEngine = async (fn: (engine: Engine) => Promise<void>) => {
    if (genRef.current) throw new Error('The model is busy — try again when the current answer finishes.')
    genRef.current = true
    stopRef.current = false
    clearTimeout(idleRef.current)
    try {
      const engine = engineRef.current ?? await load()
      if (!stopRef.current) await fn(engine) // stopped while the model was loading
    } catch (e) {
      // Usually a lost GPU device (tab hidden, driver reset); reload from cache next time.
      if (engineRef.current) unload('sleeping')
      throw e
    } finally {
      genRef.current = false
      if (engineRef.current) armIdle()
    }
  }

  const send = useCallback(async (text: string, opts: { withFile?: boolean } = {}) => {
    const content = text.trim()
    if (!content || genRef.current || loadingRef.current && !engineRef.current) return

    const t = toolsRef.current
    let system = TILO_PERSONA
    if (opts.withFile && t.openFile && t.files[t.openFile] !== undefined) {
      system += `\n\nThe user is currently viewing ${t.openFile}:\n\`\`\`\n${clip(t.files[t.openFile])}\n\`\`\``
    }
    const apiMessages: Msg[] = [
      { role: 'system', content: system },
      ...messagesRef.current.map((m): Msg => ({ role: m.role, content: m.text })),
      { role: 'user', content },
    ]

    // Tracked by index so messages injected by skill buttons meanwhile aren't overwritten.
    let slot = -1
    setMessages(m => { slot = m.length + 1; return [...m, { role: 'user', text: content }, { role: 'assistant', text: '' }] })
    const updateSlot = (patch: Partial<ChatMsg>) => setMessages(m => {
      if (slot < 0 || slot >= m.length) return m
      const next = m.slice()
      next[slot] = { ...next[slot], ...patch }
      return next
    })

    try {
      await withEngine(async engine => {
        setStatus('generating')
        for (let round = 0; ; round++) {
          const acc = await stream(engine, apiMessages, acc => updateSlot({ text: acc }))
          if (!acc) { updateSlot({ text: '…(no response)' }); return }
          const m = TOOL_RE.exec(acc)
          if (!m || stopRef.current || round >= MAX_TOOL_ROUNDS) return

          const [tag, rawName, rawArg] = m
          const name = rawName.toUpperCase(), arg = rawArg.trim()
          const before = acc.replace(tag, '').trim()

          if (name === 'OPEN') {
            const [, file, line] = /^(.*?)(?::(\d+))?$/.exec(arg)!
            const f = findFile(t.files, resolvePath('', file))
            if (f) t.onOpenFile(f, line ? +line : undefined)
            updateSlot({ text: (before ? before + '\n\n' : '') + (f ? `📂 Opened \`${f}\`` : `⚠️ No file \`${file}\``) })
            return
          }

          updateSlot({ text: before || '…', tool: `${TOOL_LABEL[name]} ${arg}` })
          setStatus('fetching')
          const result = await runTool(name, arg, t)
          if (stopRef.current) { updateSlot({ text: before || '(stopped)', tool: undefined }); return }

          if (before) {
            updateSlot({ text: before, tool: undefined })
            setMessages(m => { slot = m.length; return [...m, { role: 'assistant', text: '' }] })
          } else {
            updateSlot({ text: '', tool: undefined })
          }
          apiMessages.push({ role: 'assistant', content: acc }, { role: 'user', content: result })
          setStatus('generating')
        }
      })
      setStatus('ready')
    } catch (e) {
      console.error('LLM generation failed', e)
      updateSlot({ tool: undefined, text: `⚠️ ${(e as Error | undefined)?.message || 'Generation failed.'} Send again — the model reloads automatically.` })
    }
  }, [load, armIdle, unload]) // eslint-disable-line react-hooks/exhaustive-deps

  const complete = useCallback(async (prompt: string, context: string | undefined, onToken: (delta: string) => void) => {
    const content = context ? `${prompt}\n\nInput:\n\`\`\`\n${clip(context)}\n\`\`\`` : prompt
    await withEngine(async engine => {
      let printed = 0
      await stream(engine, [{ role: 'system', content: TERMINAL_PERSONA }, { role: 'user', content }], acc => {
        onToken(acc.slice(printed)); printed = acc.length
      }, 0.4)
    })
  }, [load, armIdle, unload]) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => {
    if (genRef.current) return
    setMessages([{ role: 'assistant', text: GREETING }])
  }, [])

  const inject = useCallback((userText: string, assistantText: string) => {
    setMessages(m => [...m, { role: 'user', text: userText }, { role: 'assistant', text: assistantText }])
  }, [])

  return { status, progress, progressText, error, modelSize, modelName, messages, openFile: tools.openFile, send, complete, stop, clear, load, autoload, inject }
}
