'use client'

import type { LanguageRegistration } from 'shiki/core'
import { THEMES } from '../theme'
import { GRAMMARS } from '../languages'

export type Monaco = typeof import('./monaco-slim')

// Spelled out so the bundler can split each grammar into its own chunk.
const GRAMMAR_LOADERS: Record<string, () => Promise<{ default: LanguageRegistration[] }>> = {
  typescript:  () => import('@shikijs/langs/typescript'),
  tsx:         () => import('@shikijs/langs/tsx'),
  javascript:  () => import('@shikijs/langs/javascript'),
  jsx:         () => import('@shikijs/langs/jsx'),
  json:        () => import('@shikijs/langs/json'),
  jsonc:       () => import('@shikijs/langs/jsonc'),
  markdown:    () => import('@shikijs/langs/markdown'),
  css:         () => import('@shikijs/langs/css'),
  dockerfile:  () => import('@shikijs/langs/dockerfile'),
  yaml:        () => import('@shikijs/langs/yaml'),
  groovy:      () => import('@shikijs/langs/groovy'),
  xml:         () => import('@shikijs/langs/xml'),
  shellscript: () => import('@shikijs/langs/shellscript'),
}

let loading: Promise<Monaco> | null = null

/**
 * Loads Monaco once, wires Shiki in as the tokenizer (VS Code's TextMate grammars) and registers
 * VS Code's own theme files, so highlighting matches the real editor.
 */
export function loadMonaco(): Promise<Monaco> {
  loading ??= (async () => {
    self.MonacoEnvironment = {
      getWorker: () => new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url), { type: 'module' }),
    }
    const [monaco, { createHighlighterCore }, { createJavaScriptRegexEngine }, { shikiToMonaco }] = await Promise.all([
      import('./monaco-slim'),
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/monaco'),
    ])
    const highlighter = await createHighlighterCore({
      themes: Object.values(THEMES).map(t => ({ name: t.id, type: t.type, colors: t.colors, tokenColors: t.tokenColors })),
      langs:  GRAMMARS.map(g => GRAMMAR_LOADERS[g]()),
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
    for (const id of highlighter.getLoadedLanguages()) monaco.languages.register({ id })
    shikiToMonaco(highlighter, monaco)
    return monaco
  })()
  return loading
}

/** VS Code's platform defaults for editor.fontFamily / fontSize / lineHeight. */
export function editorFont(): { fontFamily: string; fontSize: number; lineHeight: number } {
  const p = navigator.platform || navigator.userAgent
  if (/Mac|iPhone|iPad/.test(p)) return { fontFamily: "Menlo, Monaco, 'Courier New', monospace", fontSize: 12, lineHeight: 18 }
  if (/Win/.test(p))             return { fontFamily: "Consolas, 'Courier New', monospace", fontSize: 14, lineHeight: 19 }
  return { fontFamily: "'Droid Sans Mono', 'monospace', monospace", fontSize: 14, lineHeight: 19 }
}
