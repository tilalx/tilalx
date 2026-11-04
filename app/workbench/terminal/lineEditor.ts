export interface EditState { line: string; cursor: number }

const wordLeft = (s: string, i: number) => { while (i > 0 && /\s/.test(s[i - 1])) i--; while (i > 0 && !/\s/.test(s[i - 1])) i--; return i }
const wordRight = (s: string, i: number) => { while (i < s.length && /\s/.test(s[i])) i++; while (i < s.length && !/\s/.test(s[i])) i++; return i }

/** Applies a pure editing keystroke (readline/emacs keys). Returns null for keys it does not handle. */
export function edit({ line, cursor }: EditState, data: string): EditState | null {
  switch (data) {
    case '\x7f': case '\b': return cursor ? { line: line.slice(0, cursor - 1) + line.slice(cursor), cursor: cursor - 1 } : { line, cursor }
    case '\x1b[3~': case '\x04': return { line: line.slice(0, cursor) + line.slice(cursor + 1), cursor }
    case '\x1b[D': case '\x02': return { line, cursor: Math.max(0, cursor - 1) }
    case '\x1b[C': case '\x06': return { line, cursor: Math.min(line.length, cursor + 1) }
    case '\x1b[H': case '\x1bOH': case '\x01': return { line, cursor: 0 }
    case '\x1b[F': case '\x1bOF': case '\x05': return { line, cursor: line.length }
    case '\x1bb': case '\x1b[1;5D': case '\x1b[1;3D': return { line, cursor: wordLeft(line, cursor) }
    case '\x1bf': case '\x1b[1;5C': case '\x1b[1;3C': return { line, cursor: wordRight(line, cursor) }
    case '\x15': return { line: line.slice(cursor), cursor: 0 }
    case '\x0b': return { line: line.slice(0, cursor), cursor }
    case '\x17': case '\x1b\x7f': { const to = wordLeft(line, cursor); return { line: line.slice(0, to) + line.slice(cursor), cursor: to } }
    case '\x1bd': { const to = wordRight(line, cursor); return { line: line.slice(0, cursor) + line.slice(to), cursor } }
  }
  if (data.startsWith('\x1b')) return null
  // Pasted text may contain newlines; keep it on one line.
  const printable = data.replace(/\r\n?|\n/g, ' ').replace(/[\x00-\x1f\x7f]/g, '')
  if (!printable) return null
  return { line: line.slice(0, cursor) + printable + line.slice(cursor), cursor: cursor + printable.length }
}

/** Most recent history index before `from` whose entry contains `query`, or -1. */
export function searchHistory(history: string[], query: string, from = history.length): number {
  for (let i = Math.min(from, history.length) - 1; i >= 0; i--) if (history[i].includes(query)) return i
  return -1
}
