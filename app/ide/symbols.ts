export type SymbolKind = 'heading' | 'function' | 'class' | 'const' | 'component' | 'key'
export interface DocSymbol { name: string; line: number; kind: SymbolKind; level: number }

function ext(filename: string): string {
  const name = (filename || '').split('/').pop()!
  if (name === 'Dockerfile') return 'dock'
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
}

function parseMarkdown(content: string): DocSymbol[] {
  const out: DocSymbol[] = []
  content.split('\n').forEach((line, i) => {
    const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(line)
    if (m) out.push({ name: m[2].replace(/[#*`]/g, '').trim(), line: i + 1, kind: 'heading', level: m[1].length })
  })
  return out
}

const JS_PATTERNS: { re: RegExp; kind: SymbolKind }[] = [
  { re: /^\s*export\s+default\s+function\s+([A-Za-z0-9_$]+)/,             kind: 'function' },
  { re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/,     kind: 'function' },
  { re: /^\s*(?:export\s+)?class\s+([A-Za-z0-9_$]+)/,                     kind: 'class' },
  { re: /^\s*(?:export\s+)?const\s+([A-Z][A-Za-z0-9_$]*)\s*=\s*(?:\(|function|React|memo|forwardRef|\([^)]*\)\s*=>)/, kind: 'component' },
  { re: /^\s*(?:export\s+)?const\s+([a-z$_][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,  kind: 'const' },
]

function parseJs(content: string): DocSymbol[] {
  const out: DocSymbol[] = []
  const seen = new Set<string>()
  content.split('\n').forEach((line, i) => {
    for (const { re, kind } of JS_PATTERNS) {
      const m = re.exec(line)
      if (m) {
        const key = m[1] + ':' + (i + 1)
        if (!seen.has(key)) { seen.add(key); out.push({ name: m[1], line: i + 1, kind, level: 1 }) }
        break
      }
    }
  })
  return out
}

function parseCss(content: string): DocSymbol[] {
  const out: DocSymbol[] = []
  content.split('\n').forEach((line, i) => {
    const m = /^\s*([.#][A-Za-z0-9_-]+(?:[ ,>][^{]*)?)\s*\{/.exec(line)
    if (m) out.push({ name: m[1].trim(), line: i + 1, kind: 'key', level: 1 })
  })
  return out
}

function parseJsonKeys(content: string): DocSymbol[] {
  const out: DocSymbol[] = []
  content.split('\n').forEach((line, i) => {
    const m = /^\s{0,4}"([^"]+)"\s*:/.exec(line)
    if (m) out.push({ name: m[1], line: i + 1, kind: 'key', level: 1 })
  })
  return out.slice(0, 60)
}

export function parseSymbols(filename: string, content: string): DocSymbol[] {
  if (!content) return []
  const e = ext(filename)
  if (e === 'md' || e === 'markdown') return parseMarkdown(content)
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(e)) return parseJs(content)
  if (['css', 'scss'].includes(e)) return parseCss(content)
  if (e === 'json') return parseJsonKeys(content)
  return parseJs(content)
}
