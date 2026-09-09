/** Simple subsequence fuzzy score. Higher is better; 0 means no match. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0

  const t = text.toLowerCase()
  if (t === q) return 1000
  if (t.startsWith(q)) return 800 + Math.max(0, 50 - (t.length - q.length))
  if (t.includes(q)) return 600 + Math.max(0, 40 - t.indexOf(q))

  let ti = 0
  let score = 0
  let consecutive = 0
  let firstMatch = -1

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]
    let found = false
    while (ti < t.length) {
      if (t[ti] === ch) {
        if (firstMatch < 0) firstMatch = ti
        consecutive += 1
        score += 10 + consecutive * 4
        if (ti === 0) score += 8
        ti += 1
        found = true
        break
      }
      consecutive = 0
      ti += 1
    }
    if (!found) return 0
  }

  score += Math.max(0, 30 - firstMatch)
  score += Math.max(0, 40 - (t.length - q.length))
  return score
}

export function fuzzyRank<T>(
  query: string,
  items: T[],
  getText: (item: T) => Array<string | null | undefined> | string | null | undefined,
  limit = 8,
): T[] {
  const q = query.trim()
  if (!q) return []

  return items
    .map((item) => {
      const fields = getText(item)
      const parts = Array.isArray(fields) ? fields : [fields]
      const score = Math.max(0, ...parts.map((p) => (p ? fuzzyScore(q, p) : 0)))
      return { item, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item)
}
