import fs from 'node:fs'
import path from 'node:path'

import { chatCompletion } from './openai.ts'
import type { SelectedDoc } from './select.ts'

export type GeneratedFile = {
  path: string
  content: string
}

export type GenerateResult = {
  raw: string
  files: GeneratedFile[]
  summary: string
}

const FILE_BLOCK = /```file:([^\n]+)\n([\s\S]*?)```/g

export function parseFileBlocks(raw: string): GeneratedFile[] {
  const files: GeneratedFile[] = []
  for (const match of raw.matchAll(FILE_BLOCK)) {
    const filePath = match[1].trim()
    const content = match[2].replace(/\n$/, '')
    if (filePath && content.trim()) {
      files.push({ path: filePath, content })
    }
  }
  return files
}

export async function generateWithOpenAI(prompt: string): Promise<GenerateResult> {
  const raw = await chatCompletion({
    system:
      'You update markdown documentation to match code changes. Follow the output format exactly.',
    user: prompt,
    temperature: 0.2,
  })

  const files = parseFileBlocks(raw)
  const summary =
    raw
      .split('```file:')[0]
      ?.trim()
      .split('\n')
      .filter(Boolean)
      .slice(0, 6)
      .join(' ') || 'AI response received; see suggestions artifact.'

  return { raw, files, summary }
}

export function writeSuggestions(
  outputDir: string,
  files: GeneratedFile[],
  raw: string,
): { suggestionsDir: string; rawPath: string; written: string[] } {
  const suggestionsDir = path.join(outputDir, 'suggestions')
  fs.mkdirSync(suggestionsDir, { recursive: true })

  const rawPath = path.join(outputDir, 'ai-response.md')
  fs.writeFileSync(rawPath, raw, 'utf8')

  const written: string[] = []
  for (const file of files) {
    const safeRelative = file.path.replace(/^\/+/, '')
    const dest = path.join(suggestionsDir, safeRelative)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, file.content, 'utf8')
    written.push(safeRelative)
  }

  return { suggestionsDir, rawPath, written }
}

export function writeSelectionArtifact(
  outputDir: string,
  selection: {
    method: string
    docs: SelectedDoc[]
    symbols: string[]
    agentRaw?: string
  },
): string {
  const selectionPath = path.join(outputDir, 'selection.json')
  fs.writeFileSync(
    selectionPath,
    JSON.stringify(
      {
        method: selection.method,
        docs: selection.docs,
        symbols: selection.symbols,
      },
      null,
      2,
    ),
    'utf8',
  )

  if (selection.agentRaw) {
    fs.writeFileSync(path.join(outputDir, 'selection-agent.md'), selection.agentRaw, 'utf8')
  }

  return selectionPath
}
