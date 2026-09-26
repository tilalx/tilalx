import {
  AutoTokenizer, InterruptableStoppingCriteria, Qwen3_5ForCausalLM, TextStreamer,
  type PreTrainedTokenizer, type ProgressInfo,
} from '@huggingface/transformers'

let tokenizer: PreTrainedTokenizer | null = null
let model: Qwen3_5ForCausalLM | null = null
const stopping = new InterruptableStoppingCriteria()
const post = (msg: object) => self.postMessage(msg)

async function load(id: string, dtype: 'q4f16' | 'q4') {
  // Summed from per-file events: the library's own 'progress_total' counts the
  // vision encoder too (it ignores text-only loading), overstating the size ~60%.
  const files: Record<string, { loaded: number; total: number }> = {}
  const progress_callback = (info: ProgressInfo) => {
    if (info.status !== 'progress') return
    files[info.file] = { loaded: info.loaded, total: info.total }
    let loaded = 0, total = 0
    for (const f of Object.values(files)) { loaded += f.loaded; total += f.total }
    post({ type: 'progress', progress: total ? loaded / total : 0, text: `Downloading model… ${Math.round(loaded / 1e6)} / ${Math.round(total / 1e6)} MB` })
  }
  tokenizer = await AutoTokenizer.from_pretrained(id, { progress_callback })
  // *ForCausalLM on a vision-language checkpoint = text-only: the vision encoder is never downloaded.
  model = await Qwen3_5ForCausalLM.from_pretrained(id, {
    dtype: { embed_tokens: dtype, decoder_model_merged: dtype },
    device: 'webgpu',
    progress_callback,
  }) as Qwen3_5ForCausalLM
  post({ type: 'progress', progress: 1, text: 'Compiling shaders…' })
  // The first run compiles WebGPU shaders; do it now rather than on the first question.
  await model.generate({ ...tokenizer('a'), max_new_tokens: 1 } as never)
  post({ type: 'ready' })
}

async function generate(messages: { role: string; content: string }[], maxTokens: number, temperature: number) {
  if (!model || !tokenizer) throw new Error('model not loaded')
  stopping.reset()
  // Read by Qwen's chat template; thinking would eat the whole token budget.
  const opts = { add_generation_prompt: true, return_dict: true, enable_thinking: false } as const
  const inputs = tokenizer.apply_chat_template(messages, opts) as object
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => post({ type: 'token', text }),
  })
  await model.generate({
    ...inputs,
    max_new_tokens: maxTokens,
    do_sample: temperature > 0,
    temperature,
    streamer,
    stopping_criteria: stopping,
  } as never)
  post({ type: 'done' })
}

self.onmessage = async ({ data }: MessageEvent) => {
  if (data.type === 'stop') { stopping.interrupt(); return }
  try {
    if (data.type === 'load') await load(data.model, data.dtype)
    else if (data.type === 'generate') await generate(data.messages, data.maxTokens, data.temperature)
  } catch (e) {
    post({ type: 'error', message: (e as Error)?.message || String(e) })
  }
}
