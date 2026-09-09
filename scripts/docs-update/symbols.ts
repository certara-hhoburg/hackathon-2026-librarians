import { matchGlob, normalizePath } from './filter.ts'
import type { DocEntry } from './inventory.ts'

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'true',
  'false',
  'null',
  'undefined',
  'return',
  'const',
  'let',
  'var',
  'type',
  'import',
  'export',
  'default',
  'function',
  'class',
  'interface',
  'string',
  'number',
  'boolean',
  'async',
  'await',
  'new',
])

/** Pull identifiers / filenames from a unified diff for doc search. */
export function extractSymbols(patch: string, changedFiles: string[]): string[] {
  const symbols = new Set<string>()

  for (const file of changedFiles) {
    const base = normalizePath(file).split('/').pop() || ''
    const stem = base.replace(/\.[^.]+$/, '')
    if (stem.length > 2) symbols.add(stem)
    for (const part of stem.split(/[-_.]/)) {
      if (part.length > 2) symbols.add(part)
    }
  }

  const patterns = [
    /\b(?:name|slug|collection|path|route):\s*['"`]([A-Za-z][\w-]*)['"`]/g,
    /^\+\s*(?:export\s+)?(?:const|function|class|type|interface)\s+([A-Z][A-Za-z0-9_]+)/gm,
    /^\+\s*(?:export\s+)?(?:const|let|function)\s+([a-z][A-Za-z0-9_]+)/gm,
    /['"`]([a-z][a-z0-9_-]{2,})['"`]/g,
  ]

  for (const re of patterns) {
    for (const match of patch.matchAll(re)) {
      const sym = match[1]
      if (sym && !STOP.has(sym.toLowerCase()) && sym.length > 2) {
        symbols.add(sym)
      }
    }
  }

  return [...symbols].sort((a, b) => b.length - a.length).slice(0, 40)
}

export type HeuristicHit = {
  path: string
  score: number
  reasons: string[]
}

/** Score docs via frontmatter covers + path/symbol overlap (no LLM). */
export function heuristicSelectDocs(opts: {
  docs: DocEntry[]
  changedFiles: string[]
  symbols: string[]
  limit?: number
}): HeuristicHit[] {
  const { docs, changedFiles, symbols, limit = 8 } = opts
  const hits: HeuristicHit[] = []

  for (const doc of docs) {
    let score = 0
    const reasons: string[] = []

    for (const file of changedFiles) {
      for (const cover of doc.covers) {
        if (matchGlob(cover, file)) {
          score += 10
          reasons.push(`covers '${cover}' matched \`${file}\``)
        }
      }

      const fileNorm = normalizePath(file).toLowerCase()
      const docNorm = doc.path.toLowerCase()
      const fileStem = fileNorm.split('/').pop()?.replace(/\.[^.]+$/, '') || ''

      // Prefer meaningful stems (Posts → posts.md), skip tiny generic names
      if (fileStem.length > 3 && docNorm.includes(fileStem)) {
        score += 5
        reasons.push(`name overlap '${fileStem}' with \`${file}\``)
      }

      // collections/Posts.ts ↔ docs/collections/
      const segments = fileNorm.split('/').filter((s) => s && !s.includes('.') && s.length > 3)
      for (const seg of segments) {
        if (['src', 'app', 'lib', 'pkg', 'packages'].includes(seg)) continue
        if (docNorm.includes(`/${seg}/`) || docNorm.includes(`/${seg}.`)) {
          score += 2
          reasons.push(`directory segment '${seg}'`)
        }
      }
    }

    const haystack = `${doc.title} ${doc.headings.join(' ')} ${doc.excerpt}`.toLowerCase()
    for (const sym of symbols.slice(0, 15)) {
      if (sym.length < 4) continue
      if (haystack.includes(sym.toLowerCase())) {
        score += 2
        reasons.push(`symbol '${sym}' in title/headings`)
      }
    }

    if (score > 0) {
      hits.push({
        path: doc.path,
        score,
        reasons: [...new Set(reasons)].slice(0, 5),
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
