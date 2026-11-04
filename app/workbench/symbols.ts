import { languageOf } from './languages'

export interface DocSymbol {
  name: string
  /** Codicon name, e.g. symbol-function. */
  kind: string
  line: number
  endLine: number
  depth: number
}

const TS_DECL = /^(\s*)(?:export\s+)?(?:default\s+)?(?:async\s+)?(function\*?|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/
const TS_KIND: Record<string, string> = {
  function: 'symbol-function', 'function*': 'symbol-function', class: 'symbol-class', interface: 'symbol-interface',
  type: 'symbol-interface', enum: 'symbol-enum', const: 'symbol-constant', let: 'symbol-variable', var: 'symbol-variable',
}

/** A small, regex-based stand-in for a language server's document symbols. */
export function parseSymbols(path: string, text: string): DocSymbol[] {
  const lang  = languageOf(path).id
  const lines = text.split('\n')
  const out: DocSymbol[] = []

  if (lang === 'markdown') {
    let fence = false
    lines.forEach((l, i) => {
      if (/^```/.test(l)) fence = !fence
      const m = !fence && /^(#{1,6})\s+(.*)$/.exec(l)
      if (m) out.push({ name: `${m[1]} ${m[2]}`, kind: 'symbol-string', line: i + 1, endLine: lines.length, depth: m[1].length - 1 })
    })
  } else if (/^(type|java)script/.test(lang)) {
    lines.forEach((l, i) => {
      const m = TS_DECL.exec(l)
      if (m && m[1].length === 0) out.push({ name: m[3], kind: TS_KIND[m[2]], line: i + 1, endLine: lines.length, depth: 0 })
    })
  } else if (lang === 'json' || lang === 'jsonc') {
    lines.forEach((l, i) => {
      const m = /^ {2}"([^"]+)"\s*:/.exec(l)
      if (m) out.push({ name: m[1], kind: /[[{]\s*$/.test(l) ? 'symbol-module' : 'symbol-key', line: i + 1, endLine: lines.length, depth: 0 })
    })
  } else if (lang === 'css') {
    lines.forEach((l, i) => {
      const m = /^([^\s@/*}][^{]*?)\s*\{/.exec(l)
      if (m) out.push({ name: m[1], kind: 'symbol-class', line: i + 1, endLine: lines.length, depth: 0 })
    })
  } else if (lang === 'dockerfile') {
    lines.forEach((l, i) => {
      const m = /^FROM\s+(.*)$/i.exec(l)
      if (m) out.push({ name: m[1], kind: 'symbol-module', line: i + 1, endLine: lines.length, depth: 0 })
    })
  }

  // Each symbol ends where the next one at the same or a shallower depth starts.
  for (let i = 0; i < out.length; i++) {
    const next = out.slice(i + 1).find(s => s.depth <= out[i].depth)
    if (next) out[i].endLine = next.line - 1
  }
  return out
}

/** Innermost-first chain of symbols containing a line, used by breadcrumbs. */
export function symbolPath(symbols: DocSymbol[], line: number): DocSymbol[] {
  const chain: DocSymbol[] = []
  for (const s of symbols) {
    if (s.line <= line && line <= s.endLine) {
      while (chain.length && chain[chain.length - 1].depth >= s.depth) chain.pop()
      chain.push(s)
    }
  }
  return chain
}
