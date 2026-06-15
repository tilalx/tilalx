'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// Real in-browser chat backed by MLC WebLLM (WebGPU). No backend, no API keys —
// the model is fetched from the MLC CDN on first use and cached by the browser.
// Qwen2.5-1.5B: better instruction following than the previous Llama-1B at similar size.
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC'

const TILO_PERSONA = `You are the chat assistant embedded in Tilo Alexander's personal portfolio — a web app styled as a VS Code clone. You run fully in the visitor's browser as a small local AI model.

Answer questions about Tilo and how to use this editor. Keep replies concise and friendly. Use markdown formatting where it helps: \`inline code\` for short snippets, fenced code blocks for multi-line code.

**Fetching URLs:** When the user asks you to look something up or retrieve live web data, emit exactly this on its own line:
[FETCH: <url>]
You will then receive the page content and can answer based on it. Only use this for explicit web lookups.
NEVER use [FETCH:] for memes or quotes — those are served by built-in skill buttons that call the API directly. If asked for a meme or quote, tell the user to use the 🖼️ Meme or 💬 Quote buttons below the chat.

Facts about Tilo:
- Software engineer who builds polished developer tooling (this whole page is a VS Code clone he made).
- Stack: TypeScript / React / Next.js on the front end; Node, Python and Java on the back end; Docker, Terraform and Kubernetes for infra.
- Contact: GitHub github.com/tilalx, LinkedIn linkedin.com/in/tilo-alexander.
- His live projects/repos appear in the Source Control and Explorer views, with real push dates.

Using this editor:
- Ctrl+P opens files, Ctrl+Shift+P opens the command palette.
- Ctrl+\\ splits the editor, Ctrl+K Z is Zen mode. Most VS Code muscle memory works.
- Change the theme via Ctrl+Shift+P -> "Color Theme" (Catppuccin Mocha, One Dark Pro, GitHub Dark, Tokyo Night).
- The 🖼️ Meme and 💬 Quote skill buttons fetch directly from the API — no model needed.`

const GREETING = "Hi! I'm a small AI model running locally in your browser. Load me up and ask about Tilo's stack, projects, or how to drive this editor. I can also fetch live URLs if you ask!"

const FETCH_PATTERN = /\[FETCH:\s*(https?:\/\/[^\]]+)\]/i
const MAX_TOOL_ROUNDS = 3

export function useChat() {
  const [status, setStatus] = useState('idle') // idle | unsupported | loading | ready | generating | fetching | error
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: GREETING }])

  const engineRef = useRef(null)
  const workerRef = useRef(null)
  const loadingRef = useRef(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  useEffect(() => () => {
    workerRef.current?.terminate()
    workerRef.current = null
    engineRef.current = null
  }, [])

  const load = useCallback(async () => {
    if (engineRef.current) return engineRef.current
    if (loadingRef.current) return loadingRef.current

    loadingRef.current = (async () => {
      setStatus('loading')
      setError('')
      setProgress(0)
      setProgressText('Preparing…')
      try {
        const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm')

        const adapter = await navigator.gpu.requestAdapter()
        const modelId = adapter?.features?.has('shader-f16') ? MODEL_F16 : MODEL_F32

        const worker = new Worker(new URL('./llm.worker.js', import.meta.url), { type: 'module' })
        workerRef.current = worker

        const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
          initProgressCallback: (r) => {
            if (typeof r.progress === 'number') setProgress(r.progress)
            if (r.text) setProgressText(r.text)
          },
        })
        engineRef.current = engine
        setProgress(1)
        setStatus('ready')
        return engine
      } catch (e) {
        console.error('WebLLM load failed', e)
        setError(e?.message || 'Failed to load the model.')
        setStatus('error')
        workerRef.current?.terminate()
        workerRef.current = null
        loadingRef.current = null
        throw e
      }
    })()

    return loadingRef.current
  }, [])

  // Auto-load silently if the model is already in the browser cache (after load is defined)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.gpu) { setStatus('unsupported'); return }
    ;(async () => {
      try {
        const { hasModelInCache } = await import('@mlc-ai/web-llm')
        const adapter = await navigator.gpu.requestAdapter()
        const modelId = adapter?.features?.has('shader-f16') ? MODEL_F16 : MODEL_F32
        const cached = await hasModelInCache(modelId)
        if (cached) load()
      } catch { /* ignore — will load manually */ }
    })()
  }, [load])

  const send = useCallback(async (text) => {
    const content = text.trim()
    if (!content || status === 'unsupported' || status === 'loading' || status === 'generating' || status === 'fetching') return

    const history = messagesRef.current.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }))
    history.push({ role: 'user', content })
    setMessages((m) => [...m, { role: 'user', text: content }])

    let engine = engineRef.current
    if (!engine) {
      try {
        engine = await load()
      } catch {
        return
      }
    }

    setMessages((m) => [...m, { role: 'assistant', text: '' }])
    setStatus('generating')

    // Capture the index of the assistant message slot we just added so we never
    // accidentally overwrite a message injected by a concurrent skill call.
    let slotIndex = -1
    setMessages((m) => { slotIndex = m.length - 1; return m })

    // Tool-call loop: up to MAX_TOOL_ROUNDS fetch rounds before forcing a final answer
    const apiMessages = [{ role: 'system', content: TILO_PERSONA }, ...history]
    let toolRound = 0

    const updateSlot = (patch) => setMessages((m) => {
      const next = m.slice()
      if (slotIndex >= 0 && slotIndex < next.length) next[slotIndex] = { ...next[slotIndex], ...patch }
      return next
    })

    try {
      while (toolRound <= MAX_TOOL_ROUNDS) {
        const stream = await engine.chat.completions.create({
          stream: true,
          messages: apiMessages,
          temperature: 0.6,
          max_tokens: 600,
        })

        let acc = ''
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || ''
          if (!delta) continue
          acc += delta
          updateSlot({ text: acc })
        }

        if (!acc) {
          updateSlot({ text: '…(no response)' })
          break
        }

        const fetchMatch = FETCH_PATTERN.exec(acc)
        if (!fetchMatch || toolRound >= MAX_TOOL_ROUNDS) {
          break
        }

        const url = fetchMatch[1].trim()
        const textBeforeFetch = acc.replace(FETCH_PATTERN, '').trim()
        updateSlot({ text: textBeforeFetch || '…', fetching: url })
        setStatus('fetching')

        let fetchResult
        try {
          const res = await fetch('/api/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          })
          const data = await res.json()
          if (data.error) {
            fetchResult = `[Fetch error for ${url}: ${data.error}]`
          } else {
            fetchResult = `[Content of ${url} (${data.contentType}):\n${data.text}]`
          }
        } catch (e) {
          fetchResult = `[Fetch failed for ${url}: ${e.message}]`
        }

        if (textBeforeFetch) {
          // Keep the "before fetch" text in the current slot and open a new slot
          updateSlot({ text: textBeforeFetch, fetching: undefined })
          setMessages((m) => { slotIndex = m.length; return [...m, { role: 'assistant', text: '' }] })
        } else {
          // Reuse the same slot for the follow-up answer
          updateSlot({ text: '', fetching: undefined })
        }

        apiMessages.push({ role: 'assistant', content: acc })
        apiMessages.push({ role: 'user', content: fetchResult })

        setStatus('generating')
        toolRound++
      }
    } catch (e) {
      console.error('WebLLM generation failed', e)
      // AbortError = WebGPU context was interrupted (tab hidden, GPU reset, etc.).
      // The engine is now broken — tear it down so the next send() reloads it.
      if (e?.name === 'AbortError') {
        workerRef.current?.terminate()
        workerRef.current = null
        engineRef.current = null
        loadingRef.current = null
        updateSlot({ text: '⚠️ Generation was interrupted (GPU context lost). Click the message area and try again — the model will reload automatically.' })
        setStatus('idle')
      } else {
        updateSlot({ text: '⚠️ Generation failed. Try again.' })
        setStatus('ready')
      }
      return
    }

    setStatus('ready')
  }, [status, load])

  const inject = useCallback((userText, assistantText) => {
    setMessages(m => [...m, { role: 'user', text: userText }, { role: 'assistant', text: assistantText }])
  }, [])

  return { status, progress, progressText, error, messages, send, load, inject }
}
