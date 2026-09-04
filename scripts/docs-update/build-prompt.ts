import fs from 'node:fs'
import path from 'node:path'

import type { MappedChange } from './map.ts'

export type PromptInput = {
  base: string
  mapped: MappedChange[]
  uniqueDocs: string[]
  unmapped: string[]
  patch: string
  repoRoot: string
}

function readDoc(repoRoot: string, relativePath: string): string {
  const full = path.join(repoRoot, relativePath)
  if (!fs.existsSync(full)) {
    return `_(missing file: ${relativePath})_`
  }
  return fs.readFileSync(full, 'utf8')
}

export function buildPrompt(input: PromptInput): string {
  const { base, mapped, uniqueDocs, unmapped, patch, repoRoot } = input

  const mappingSection =
    mapped.length === 0
      ? '_No changed files matched documentation mappings._'
      : mapped
          .map(
            (m) =>
              `- \`${m.file}\` → ${m.docs.map((d) => `\`${d}\``).join(', ')}\n  - ${m.reasons.join('; ')}`,
          )
          .join('\n')

  const docsSection =
    uniqueDocs.length === 0
      ? '_No documentation files were mapped._'
      : uniqueDocs
          .map((doc) => {
            const body = readDoc(repoRoot, doc)
            return `### ${doc}\n\n\`\`\`markdown\n${body}\n\`\`\``
          })
          .join('\n\n')

  const truncatedPatch =
    patch.length > 40_000
      ? `${patch.slice(0, 40_000)}\n\n…[patch truncated]…`
      : patch || '_No textual patch available (binary or empty)._'

  return `You are a technical writer updating project documentation for a Payload CMS + Next.js application.

## Goal
Given the code changes below, propose precise updates to the mapped markdown documentation so it stays accurate. Prefer small, surgical edits. Do not invent APIs or fields that are not present in the diff. If a mapped doc does not need changes, say so explicitly.

## Diff base
Compared against: ${base}

## Changed files → documentation map
${mappingSection}

## Unmapped changed files
${unmapped.length ? unmapped.map((f) => `- \`${f}\``).join('\n') : '_None_'}

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
  summaryLines: string[]
  uniqueDocs: string[]
  mapped: MappedChange[]
  promptPath: string
  suggestionsPath?: string
  modelNote?: string
}): string {
  const marker = '<!-- docs-update-bot -->'
  const mapLines =
    opts.mapped.length === 0
      ? '_No mapped documentation impacts detected._'
      : opts.mapped
          .map((m) => `- \`${m.file}\` → ${m.docs.map((d) => `\`${d}\``).join(', ')}`)
          .join('\n')

  const docsList =
    opts.uniqueDocs.length === 0
      ? '_None_'
      : opts.uniqueDocs.map((d) => `- \`${d}\``).join('\n')

  const modeLine =
    opts.mode === 'apply'
      ? `**Mode:** AI apply (${opts.modelNote || 'OpenAI'}) — suggestions written to \`${opts.suggestionsPath}\`.`
      : '**Mode:** prompt-only — no API key / `--apply` not used. Copy the prompt into your LLM of choice, or re-run with `--apply` when `OPENAI_API_KEY` is set.'

  return `${marker}
## Documentation update check

${modeLine}

### Summary
${opts.summaryLines.map((l) => `- ${l}`).join('\n')}

### Mapped docs
${docsList}

### File → doc mapping
${mapLines}

### Artifacts
- Prompt: \`${opts.promptPath}\`${opts.suggestionsPath ? `\n- Suggestions: \`${opts.suggestionsPath}\`` : ''}

<details>
<summary>How to use this</summary>

1. Review the mapped docs and the generated prompt artifact.
2. If suggestions were generated, open the suggestions folder and apply the markdown updates in a follow-up commit or PR.
3. To enable AI generation in CI, add repository secret \`OPENAI_API_KEY\`.

</details>
`
}
