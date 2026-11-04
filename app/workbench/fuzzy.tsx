/** Subsequence match with a preference for contiguous runs and word starts; returns matched indices. */
export function fuzzyMatch(query: string, target: string): { score: number; indices: number[] } | null {
  if (!query) return { score: 0, indices: [] }
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // Contiguous substring first: that's what people usually type.
  const at = t.indexOf(q)
  if (at >= 0) {
    const wordStart = at === 0 || /[\s/._\-:]/.test(t[at - 1])
    return { score: 1000 - at + (wordStart ? 200 : 0) - target.length, indices: Array.from(q, (_, i) => at + i) }
  }

  const indices: number[] = []
  let score = 0
  let ti = 0
  for (const ch of q) {
    if (ch === ' ') continue
    const found = t.indexOf(ch, ti)
    if (found < 0) return null
    if (indices.length && found === indices[indices.length - 1] + 1) score += 5
    if (found === 0 || /[\s/._\-:]/.test(t[found - 1])) score += 10
    indices.push(found)
    ti = found + 1
  }
  return { score: score - target.length, indices }
}

export function Highlighted({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return <>{text}</>
  const set = new Set(indices)
  const parts: { s: string; hit: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const hit = set.has(i)
    if (parts.length && parts[parts.length - 1].hit === hit) parts[parts.length - 1].s += text[i]
    else parts.push({ s: text[i], hit })
  }
  return <>{parts.map((p, i) => p.hit ? <span key={i} className="highlight">{p.s}</span> : <span key={i}>{p.s}</span>)}</>
}
