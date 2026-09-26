export interface Msg { role: 'system' | 'user' | 'assistant'; content: string }

export interface Engine {
  name:     string
  generate: (msgs: Msg[], onDelta: (delta: string) => void, opts: { temperature: number; maxTokens: number }) => Promise<void>
  stop:     () => void
  dispose:  () => void
}

// No @webgpu/types or Prompt API typings installed.
interface LMSession {
  promptStreaming(input: string, opts?: { signal?: AbortSignal }): AsyncIterable<string>
  destroy(): void
}
declare global {
  interface Navigator {
    gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> }
    deviceMemory?: number
  }
  var LanguageModel: {
    availability(opts?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
    create(opts?: object): Promise<LMSession>
  } | undefined
}

const LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] }

// Only 'available': never trigger Nano's multi-GB download.
export async function nanoAvailable(): Promise<boolean> {
  try { return typeof LanguageModel !== 'undefined' && await LanguageModel.availability(LANG) === 'available' }
  catch { return false }
}

function createNanoEngine(): Engine {
  let ctrl: AbortController | null = null
  return {
    name: 'Gemini Nano (built into Chrome)',
    async generate(msgs, onDelta) {
      ctrl = new AbortController()
      const signal = ctrl.signal
      const [sys, ...rest] = msgs
      while (rest[0]?.role === 'assistant') rest.shift() // history must open with the user
      const last = rest.pop()!
      const session = await LanguageModel!.create({ ...LANG, initialPrompts: [sys, ...rest], signal })
      try {
        for await (const delta of session.promptStreaming(last.content, { signal })) onDelta(delta)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') throw e
      } finally {
        session.destroy()
      }
    },
    stop: () => ctrl?.abort(),
    dispose: () => ctrl?.abort(),
  }
}

const MODELS = {
  small: { id: 'onnx-community/Qwen3.5-0.8B-ONNX', label: 'Qwen3.5-0.8B', size: '~600 MB, one-time download' },
  large: { id: 'onnx-community/Qwen3.5-2B-ONNX',   label: 'Qwen3.5-2B',   size: '~1.4 GB, one-time download' },
}
export type QwenModel = typeof MODELS.small & { dtype: 'q4f16' | 'q4' }

// 2B only on capable desktops; phones and ≤4 GB devices get 0.8B so the tab isn't OOM-killed.
export async function pickModel(): Promise<QwenModel> {
  const adapter = await navigator.gpu!.requestAdapter()
  const f16     = !!adapter?.features?.has('shader-f16')
  const strong  = f16 && (navigator.deviceMemory ?? 8) >= 8 && !/Mobi|Android/i.test(navigator.userAgent)
  return { ...(strong ? MODELS.large : MODELS.small), dtype: f16 ? 'q4f16' : 'q4' }
}

export async function isCached(m: QwenModel): Promise<boolean> {
  try {
    const keys = await (await caches.open('transformers-cache')).keys()
    return keys.some(r => r.url.includes(`${m.id}/resolve/main/onnx/decoder_model_merged_${m.dtype}.onnx_data`))
  } catch { return false }
}

type WorkerMsg =
  | { type: 'progress'; progress: number; text: string }
  | { type: 'token'; text: string }
  | { type: 'ready' | 'done' }
  | { type: 'error'; message: string }

async function createWorkerEngine(m: QwenModel, onProgress: (p: number, text: string) => void): Promise<Engine> {
  const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' })
  let handle: (d: WorkerMsg) => void = () => {}
  worker.onmessage = (e: MessageEvent<WorkerMsg>) => handle(e.data)
  worker.onerror = e => handle({ type: 'error', message: e.message || 'worker crashed' })

  // One request in flight at a time (useChat holds a lock), so a single handler suffices.
  const call = (msg: object, onToken?: (t: string) => void) => new Promise<void>((resolve, reject) => {
    handle = d => {
      if (d.type === 'progress') onProgress(d.progress, d.text)
      else if (d.type === 'token') onToken?.(d.text)
      else if (d.type === 'error') reject(new Error(d.message))
      else resolve()
    }
    worker.postMessage(msg)
  })

  try { await call({ type: 'load', model: m.id, dtype: m.dtype }) }
  catch (e) { worker.terminate(); throw e }

  return {
    name: m.label,
    generate: (messages, onDelta, o) => call({ type: 'generate', messages, maxTokens: o.maxTokens, temperature: o.temperature }, onDelta),
    stop: () => worker.postMessage({ type: 'stop' }),
    dispose: () => worker.terminate(),
  }
}

export async function createEngine(onProgress: (p: number, text: string) => void): Promise<Engine> {
  if (await nanoAvailable()) return createNanoEngine()
  if (!navigator.gpu) throw new Error('This chat needs WebGPU (Chrome, Edge, Safari 26+ or Firefox 141+).')
  return createWorkerEngine(await pickModel(), onProgress)
}
