'use client'

import type { LanguageRegistration } from 'shiki/core'
import { THEMES } from '../theme'
import { GRAMMARS } from '../languages'

export type Monaco = typeof import('./monaco-slim')

const GRAMMAR_LOADERS: Record<string, () => Promise<{ default: LanguageRegistration[] }>> = {
  typescript:  () => import('shiki/langs/typescript.mjs'),
  tsx:         () => import('shiki/langs/tsx.mjs'),
  javascript:  () => import('shiki/langs/javascript.mjs'),
  jsx:         () => import('shiki/langs/jsx.mjs'),
  json:        () => import('shiki/langs/json.mjs'),
  jsonc:       () => import('shiki/langs/jsonc.mjs'),
  markdown:    () => import('shiki/langs/markdown.mjs'),
  css:         () => import('shiki/langs/css.mjs'),
  dockerfile:  () => import('shiki/langs/dockerfile.mjs'),
  yaml:        () => import('shiki/langs/yaml.mjs'),
  groovy:      () => import('shiki/langs/groovy.mjs'),
  xml:         () => import('shiki/langs/xml.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
}

let loading: Promise<Monaco> | null = null

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
  })().catch(e => { loading = null; throw e })
  return loading
}

export function editorFont(): { fontFamily: string; fontSize: number; lineHeight: number } {
  const p = navigator.platform || navigator.userAgent
  if (/Mac|iPhone|iPad/.test(p)) return { fontFamily: "Menlo, Monaco, 'Courier New', monospace", fontSize: 12, lineHeight: 18 }
  if (/Win/.test(p))             return { fontFamily: "Consolas, 'Courier New', monospace", fontSize: 14, lineHeight: 19 }
  return { fontFamily: "'Droid Sans Mono', 'monospace', monospace", fontSize: 14, lineHeight: 19 }
}
