import fs from 'node:fs'
import path from 'node:path'

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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You update markdown documentation to match code changes. Follow the output format exactly.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${body}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = data.choices?.[0]?.message?.content || ''
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
