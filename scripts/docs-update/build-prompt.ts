import fs from 'node:fs'
import path from 'node:path'

import type { SelectedDoc } from './select.ts'

export type PromptInput = {
  base: string
  selectedDocs: SelectedDoc[]
  selectionMethod: 'agent' | 'heuristic'
  changedFiles: string[]
  ignoredFiles: string[]
  patch: string
  repoRoot: string
  symbols: string[]
}

function readDoc(repoRoot: string, relativePath: string): string {
  const full = path.join(repoRoot, relativePath)
  if (!fs.existsSync(full)) {
    return `_(missing file: ${relativePath})_`
  }
  return fs.readFileSync(full, 'utf8')
}

export function buildPrompt(input: PromptInput): string {
  const {
    base,
    selectedDocs,
    selectionMethod,
    changedFiles,
    ignoredFiles,
    patch,
    repoRoot,
    symbols,
  } = input

  const selectionSection =
    selectedDocs.length === 0
      ? '_No documentation files were selected for update._'
      : selectedDocs
          .map(
            (d) =>
              `- \`${d.path}\` (confidence ${d.confidence.toFixed(2)}): ${d.reason}`,
          )
          .join('\n')

  const docsSection =
    selectedDocs.length === 0
      ? '_None_'
      : selectedDocs
          .map((doc) => {
            const body = readDoc(repoRoot, doc.path)
            return `### ${doc.path}\n\n\`\`\`markdown\n${body}\n\`\`\``
          })
          .join('\n\n')

  const truncatedPatch =
    patch.length > 40_000
      ? `${patch.slice(0, 40_000)}\n\n…[patch truncated]…`
      : patch || '_No textual patch available (binary or empty)._'

  return `You are a technical writer updating project documentation for a Payload CMS + Next.js application.

## Goal
Given the code changes below, propose precise updates to the **selected** markdown documentation so it stays accurate. Prefer small, surgical edits. Do not invent APIs or fields that are not present in the diff. If a selected doc does not need changes, say so explicitly.

## Diff base
Compared against: ${base}

## Selection method
${selectionMethod === 'agent' ? 'LLM triage agent' : 'Heuristic scoring (no API key / agent unavailable)'}

## Selected documentation
${selectionSection}

## Changed files
${changedFiles.map((f) => `- \`${f}\``).join('\n') || '_None_'}

## Ignored (noise) files
${ignoredFiles.length ? ignoredFiles.map((f) => `- \`${f}\``).join('\n') : '_None_'}

## Symbols extracted from the diff
${symbols.length ? symbols.map((s) => `- ${s}`).join('\n') : '_None_'}

## Current documentation
${docsSection}

## Code diff
\`\`\`diff
${truncatedPatch}
\`\`\`

## Output format
Respond with:
1. A short summary (2–4 sentences) of what documentation should change and why.
2. For each file that needs updates, a fenced block in this exact form:

\`\`\`file:<relative-path>
<full updated markdown file contents>
\`\`\`

Only include \`file:\` blocks for docs that actually change. Use paths relative to the repo root (e.g. \`docs/collections/posts.md\`).
`
}

export function buildCommentBody(opts: {
  mode: 'prompt' | 'apply'
  selectionMethod: 'agent' | 'heuristic'
  summaryLines: string[]
  selectedDocs: SelectedDoc[]
  changedFiles: string[]
  promptPath: string
  selectionPath: string
  suggestionsPath?: string
  modelNote?: string
}): string {
  const marker = '<!-- docs-update-bot -->'

  const docsList =
    opts.selectedDocs.length === 0
      ? '_None selected — no documentation updates appear necessary._'
      : opts.selectedDocs
          .map(
            (d) =>
              `- \`${d.path}\` _(confidence ${d.confidence.toFixed(2)})_ — ${d.reason}`,
          )
          .join('\n')

  const filesList =
    opts.changedFiles.length === 0
      ? '_None_'
      : opts.changedFiles
          .slice(0, 30)
          .map((f) => `- \`${f}\``)
          .join('\n') +
        (opts.changedFiles.length > 30
          ? `\n- _…and ${opts.changedFiles.length - 30} more_`
          : '')

  const modeLine =
    opts.mode === 'apply'
      ? `**Mode:** select (${opts.selectionMethod}) + AI apply (${opts.modelNote || 'OpenAI'}) — suggestions in \`${opts.suggestionsPath}\`.`
      : `**Mode:** select (${opts.selectionMethod}) + prompt-only. Re-run with \`--apply\` (and \`OPENAI_API_KEY\`) to generate doc patches.`

  return `${marker}
## Documentation update check

${modeLine}

### Summary
${opts.summaryLines.map((l) => `- ${l}`).join('\n')}

### Agent-selected docs
${docsList}

### Changed files considered
${filesList}

### Artifacts
- Selection: \`${opts.selectionPath}\`
- Prompt: \`${opts.promptPath}\`${opts.suggestionsPath ? `\n- Suggestions: \`${opts.suggestionsPath}\`` : ''}

<details>
<summary>How this works</summary>

1. Git diff → filter noise files.
2. Build a docs inventory (\`docs/**/*.md\`, including optional \`covers:\` frontmatter).
3. **Triage agent** (OpenAI when \`OPENAI_API_KEY\` is set) picks which docs are implicated; otherwise heuristics are used.
4. A second step builds an update prompt and optionally generates markdown suggestions.
5. Nothing is auto-committed — review suggestions and open a docs PR if desired.

</details>
`
}
