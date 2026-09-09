import { inventorySummary, type DocEntry } from './inventory.ts'
import { chatCompletion } from './openai.ts'
import { extractSymbols, heuristicSelectDocs, type HeuristicHit } from './symbols.ts'

export type SelectedDoc = {
  path: string
  reason: string
  confidence: number
}

export type SelectionResult = {
  method: 'agent' | 'heuristic'
  docs: SelectedDoc[]
  symbols: string[]
  heuristicHits: HeuristicHit[]
  agentRaw?: string
}

function heuristicToSelected(hits: HeuristicHit[]): SelectedDoc[] {
  return hits.map((h) => ({
    path: h.path,
    reason: h.reasons.join('; ') || `heuristic score ${h.score}`,
    confidence: Math.min(0.95, h.score / 15),
  }))
}

function parseAgentJson(raw: string): SelectedDoc[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const text = (fenced ? fenced[1] : raw).trim()
  const parsed = JSON.parse(text) as {
    docs?: Array<{ path?: string; reason?: string; confidence?: number }>
    noneNeeded?: boolean
  }

  if (parsed.noneNeeded && (!parsed.docs || parsed.docs.length === 0)) {
    return []
  }

  const docs: SelectedDoc[] = []
  for (const item of parsed.docs || []) {
    if (!item?.path) continue
    docs.push({
      path: item.path.replace(/^\/+/, ''),
      reason: item.reason || 'Selected by agent',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
    })
  }
  return docs
}

function buildSelectPrompt(opts: {
  changedFiles: string[]
  patch: string
  inventory: DocEntry[]
  heuristicHits: HeuristicHit[]
  symbols: string[]
}): string {
  const truncatedPatch =
    opts.patch.length > 24_000
      ? `${opts.patch.slice(0, 24_000)}\n\n…[patch truncated]…`
      : opts.patch || '(no textual patch)'

  const heuristicHint =
    opts.heuristicHits.length === 0
      ? '_No strong heuristic hits._'
      : opts.heuristicHits
          .map((h) => `- \`${h.path}\` (score ${h.score}): ${h.reasons.join('; ')}`)
          .join('\n')

  return `You are a documentation triage agent for a software repository.

Given code changes and a documentation inventory, decide which documentation files (if any) likely need updates. Do NOT write the doc updates yet — only select paths.

## Changed files
${opts.changedFiles.map((f) => `- \`${f}\``).join('\n') || '_None_'}

## Extracted symbols (hints)
${opts.symbols.length ? opts.symbols.map((s) => `- ${s}`).join('\n') : '_None_'}

## Heuristic pre-ranking (optional hints, you may disagree)
${heuristicHint}

## Documentation inventory
${inventorySummary(opts.inventory)}

## Diff
\`\`\`diff
${truncatedPatch}
\`\`\`

## Rules
- Prefer precision: only select docs that describe APIs, fields, setup steps, or behaviors touched by the diff.
- Prefer docs whose \`covers\` globs match, or whose headings/content clearly relate to changed symbols/paths.
- Ignore pure refactors with no user/docs-facing impact.
- Cap at 8 docs.
- Paths must be exact paths from the inventory.

## Output
Respond with ONLY JSON (no prose outside JSON):

\`\`\`json
{
  "docs": [
    { "path": "docs/example.md", "reason": "why this doc is implicated", "confidence": 0.0 }
  ],
  "noneNeeded": false
}
\`\`\`
`
}

/**
 * Select which docs need updates.
 * Uses an LLM agent when OPENAI_API_KEY is set; otherwise heuristic scoring.
 */
export async function selectDocs(opts: {
  docs: DocEntry[]
  changedFiles: string[]
  patch: string
  forceHeuristic?: boolean
}): Promise<SelectionResult> {
  const symbols = extractSymbols(opts.patch, opts.changedFiles)
  const heuristicHits = heuristicSelectDocs({
    docs: opts.docs,
    changedFiles: opts.changedFiles,
    symbols,
  })

  const canAgent = Boolean(process.env.OPENAI_API_KEY) && !opts.forceHeuristic

  if (!canAgent) {
    return {
      method: 'heuristic',
      docs: heuristicToSelected(heuristicHits),
      symbols,
      heuristicHits,
    }
  }

  const prompt = buildSelectPrompt({
    changedFiles: opts.changedFiles,
    patch: opts.patch,
    inventory: opts.docs,
    heuristicHits,
    symbols,
  })

  try {
    const raw = await chatCompletion({
      system:
        'You triage documentation impact from code diffs. Reply with JSON only.',
      user: prompt,
      temperature: 0.1,
    })

    let selected = parseAgentJson(raw)
    const inventoryPaths = new Set(opts.docs.map((d) => d.path))
    selected = selected.filter((d) => inventoryPaths.has(d.path))

    // If the agent returns nothing but heuristics are strong, keep top heuristic hits.
    if (selected.length === 0 && heuristicHits.some((h) => h.score >= 8)) {
      selected = heuristicToSelected(heuristicHits.filter((h) => h.score >= 8))
    }

    return {
      method: 'agent',
      docs: selected,
      symbols,
      heuristicHits,
      agentRaw: raw,
    }
  } catch (err) {
    console.warn('Doc-selection agent failed; falling back to heuristics:', err)
    return {
      method: 'heuristic',
      docs: heuristicToSelected(heuristicHits),
      symbols,
      heuristicHits,
      agentRaw: err instanceof Error ? String(err.message) : String(err),
    }
  }
}
