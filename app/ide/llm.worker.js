// Web Worker entry for WebLLM. Running the engine off the main thread keeps the
// IDE responsive while the model downloads and generates tokens. The client side
// talks to this via CreateWebWorkerMLCEngine (see useTiloChat.js).
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (msg) => handler.onmessage(msg)
