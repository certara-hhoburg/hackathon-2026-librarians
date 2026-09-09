#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCommentBody, buildPrompt } from './build-prompt.ts'
import { collectDiff } from './collect-diff.ts'
import { filterChangedFiles } from './filter.ts'
import { generateWithOpenAI, writeSelectionArtifact, writeSuggestions } from './generate.ts'
import { loadDocsInventory } from './inventory.ts'
import { selectDocs } from './select.ts'

function parseArgs(argv: string[]) {
  let base: string | undefined
  let apply = false
  let forceHeuristic = false
  let outputDir = 'docs-update-output'

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--base' && argv[i + 1]) {
      base = argv[++i]
    } else if (arg === '--apply') {
      apply = true
    } else if (arg === '--heuristic-only') {
      forceHeuristic = true
    } else if (arg === '--output' && argv[i + 1]) {
      outputDir = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return { base, apply, forceHeuristic, outputDir }
}

function printHelp() {
  console.log(`Usage: npm run docs:update -- [options]

Options:
  --base <ref>        Git base ref (default: origin/$GITHUB_BASE_REF or origin/main)
  --apply             After selecting docs, generate updated markdown via OpenAI
  --heuristic-only    Skip the LLM triage agent; use covers/symbol scoring only
  --output <dir>      Output directory (default: docs-update-output)
  -h, --help          Show help

With OPENAI_API_KEY set, the triage agent selects which docs need updates
(no per-file map required). In CI, --apply is implied when the key is present.
`)
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const { base, apply, forceHeuristic, outputDir: outputRel } = parseArgs(process.argv.slice(2))
  const outputDir = path.resolve(repoRoot, outputRel)

  fs.mkdirSync(outputDir, { recursive: true })

  const diff = collectDiff(repoRoot, base)
  const { relevant, ignored, other } = filterChangedFiles(diff.files)
  const inventory = loadDocsInventory(repoRoot)

  console.log(
    `Diff: ${diff.files.length} file(s) → ${relevant.length} for triage, ${other.length} non-code, ${ignored.length} ignored; ${inventory.length} docs in inventory`,
  )

  const selection = await selectDocs({
    docs: inventory,
    changedFiles: relevant,
    patch: diff.patch,
    forceHeuristic,
  })

  const selectionPathAbs = writeSelectionArtifact(outputDir, selection)
  const selectionPath = path.relative(repoRoot, selectionPathAbs)

  console.log(
    `Selection (${selection.method}): ${selection.docs.length} doc(s)` +
      (selection.docs.length
        ? `\n${selection.docs.map((d) => `  - ${d.path}: ${d.reason}`).join('\n')}`
        : ''),
  )

  const prompt = buildPrompt({
    base: diff.base,
    selectedDocs: selection.docs,
    selectionMethod: selection.method,
    changedFiles: relevant,
    ignoredFiles: ignored,
    patch: diff.patch,
    repoRoot,
    symbols: selection.symbols,
  })

  const promptPath = path.join(outputDir, 'prompt.md')
  fs.writeFileSync(promptPath, prompt, 'utf8')

  const summaryLines = [
    `Compared against \`${diff.base}\`.`,
    `${relevant.length} relevant changed file(s); triage via **${selection.method}** selected ${selection.docs.length} doc(s).`,
  ]

  let mode: 'prompt' | 'apply' = 'prompt'
  let suggestionsPath: string | undefined
  let modelNote: string | undefined

  const shouldApply = apply || Boolean(process.env.OPENAI_API_KEY && process.env.CI)
  if (shouldApply && process.env.OPENAI_API_KEY && selection.docs.length > 0) {
    mode = 'apply'
    modelNote = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    console.log(`Generating doc suggestions (${modelNote})…`)
    const result = await generateWithOpenAI(prompt)
    const written = writeSuggestions(outputDir, result.files, result.raw)
    suggestionsPath = path.relative(repoRoot, written.suggestionsDir)
    summaryLines.push(result.summary)
    if (written.written.length) {
      summaryLines.push(`Wrote ${written.written.length} suggested file(s).`)
    } else {
      summaryLines.push('AI response contained no `file:` blocks (docs may already be accurate).')
    }
  } else if (shouldApply && selection.docs.length === 0) {
    summaryLines.push('No docs selected — skipped suggestion generation.')
  } else if (shouldApply && !process.env.OPENAI_API_KEY) {
    summaryLines.push('`--apply` requested but OPENAI_API_KEY is missing; stayed in prompt-only mode.')
  } else if (selection.method === 'agent') {
    summaryLines.push('Triage agent ran; pass `--apply` to also generate doc patches.')
  } else {
    summaryLines.push(
      'Heuristic triage (no OPENAI_API_KEY). Set the key in GitHub Actions to run the selection agent.',
    )
  }

  const comment = buildCommentBody({
    mode,
    selectionMethod: selection.method,
    summaryLines,
    selectedDocs: selection.docs,
    changedFiles: relevant,
    promptPath: path.relative(repoRoot, promptPath),
    selectionPath,
    suggestionsPath,
    modelNote,
  })

  const commentPath = path.join(outputDir, 'comment.md')
  fs.writeFileSync(commentPath, comment, 'utf8')

  const meta = {
    base: diff.base,
    files: diff.files,
    relevant,
    other,
    ignored,
    selectionMethod: selection.method,
    selectedDocs: selection.docs,
    symbols: selection.symbols,
    mode,
    promptPath: path.relative(repoRoot, promptPath),
    commentPath: path.relative(repoRoot, commentPath),
    selectionPath,
    suggestionsPath,
  }
  fs.writeFileSync(path.join(outputDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')

  console.log(comment)
  console.log(`\nWrote artifacts to ${path.relative(repoRoot, outputDir)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
