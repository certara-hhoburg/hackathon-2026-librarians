#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildCommentBody, buildPrompt } from './build-prompt.ts'
import { collectDiff } from './collect-diff.ts'
import { generateWithOpenAI, writeSuggestions } from './generate.ts'
import { mapChangedFiles } from './map.ts'

function parseArgs(argv: string[]) {
  let base: string | undefined
  let apply = false
  let outputDir = 'docs-update-output'

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--base' && argv[i + 1]) {
      base = argv[++i]
    } else if (arg === '--apply') {
      apply = true
    } else if (arg === '--output' && argv[i + 1]) {
      outputDir = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return { base, apply, outputDir }
}

function printHelp() {
  console.log(`Usage: npm run docs:update -- [options]

Options:
  --base <ref>   Git base ref to diff against (default: origin/$GITHUB_BASE_REF or origin/main)
  --apply        Call OpenAI when OPENAI_API_KEY is set and write suggested doc files
  --output <dir> Output directory (default: docs-update-output)
  -h, --help     Show help
`)
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const { base, apply, outputDir: outputRel } = parseArgs(process.argv.slice(2))
  const outputDir = path.resolve(repoRoot, outputRel)

  fs.mkdirSync(outputDir, { recursive: true })

  const diff = collectDiff(repoRoot, base)
  const { mapped, uniqueDocs, unmapped } = mapChangedFiles(diff.files)

  const prompt = buildPrompt({
    base: diff.base,
    mapped,
    uniqueDocs,
    unmapped,
    patch: diff.patch,
    repoRoot,
  })

  const promptPath = path.join(outputDir, 'prompt.md')
  fs.writeFileSync(promptPath, prompt, 'utf8')

  const summaryLines = [
    `Compared against \`${diff.base}\`.`,
    `${diff.files.length} changed file(s); ${mapped.length} mapped to docs; ${uniqueDocs.length} unique doc target(s).`,
  ]

  let mode: 'prompt' | 'apply' = 'prompt'
  let suggestionsPath: string | undefined
  let modelNote: string | undefined

  const shouldApply = apply || Boolean(process.env.OPENAI_API_KEY && process.env.CI)
  if (shouldApply && process.env.OPENAI_API_KEY) {
    mode = 'apply'
    modelNote = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    console.log(`Calling OpenAI (${modelNote})…`)
    const result = await generateWithOpenAI(prompt)
    const written = writeSuggestions(outputDir, result.files, result.raw)
    suggestionsPath = path.relative(repoRoot, written.suggestionsDir)
    summaryLines.push(result.summary)
    if (written.written.length) {
      summaryLines.push(`Wrote ${written.written.length} suggested file(s).`)
    } else {
      summaryLines.push('AI response contained no `file:` blocks (docs may already be accurate).')
    }
  } else if (shouldApply && !process.env.OPENAI_API_KEY) {
    summaryLines.push('`--apply` requested but OPENAI_API_KEY is missing; stayed in prompt-only mode.')
  } else {
    summaryLines.push('Prompt-only mode. Pass `--apply` with OPENAI_API_KEY to generate suggestions.')
  }

  const comment = buildCommentBody({
    mode,
    summaryLines,
    uniqueDocs,
    mapped,
    promptPath: path.relative(repoRoot, promptPath),
    suggestionsPath,
    modelNote,
  })

  const commentPath = path.join(outputDir, 'comment.md')
  fs.writeFileSync(commentPath, comment, 'utf8')

  const meta = {
    base: diff.base,
    files: diff.files,
    mapped,
    uniqueDocs,
    unmapped,
    mode,
    promptPath: path.relative(repoRoot, promptPath),
    commentPath: path.relative(repoRoot, commentPath),
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
