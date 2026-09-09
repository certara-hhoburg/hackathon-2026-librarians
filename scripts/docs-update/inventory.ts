import fs from 'node:fs'
import path from 'node:path'

export type DocEntry = {
  path: string
  title: string
  headings: string[]
  /** Optional ownership globs from YAML frontmatter `covers:`. */
  covers: string[]
  excerpt: string
  bodyWithoutFrontmatter: string
}

function walkMarkdown(dir: string, root: string, out: string[]): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkMarkdown(full, root, out)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(path.relative(root, full).replaceAll('\\', '/'))
    }
  }
}

function parseFrontmatter(raw: string): { covers: string[]; body: string } {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    return { covers: [], body: raw }
  }

  const end = raw.indexOf('\n---', 4)
  if (end === -1) return { covers: [], body: raw }

  const fm = raw.slice(4, end)
  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  const covers: string[] = []

  const coversBlock = fm.match(/^covers:\s*\n((?:\s*-\s+.+\n?)*)/m)
  if (coversBlock) {
    for (const line of coversBlock[1].split('\n')) {
      const m = line.match(/^\s*-\s+(.+)\s*$/)
      if (m) covers.push(m[1].replace(/^['"]|['"]$/g, '').trim())
    }
  } else {
    const inline = fm.match(/^covers:\s*\[([^\]]*)\]/m)
    if (inline) {
      for (const part of inline[1].split(',')) {
        const cleaned = part.trim().replace(/^['"]|['"]$/g, '')
        if (cleaned) covers.push(cleaned)
      }
    }
  }

  return { covers, body }
}

function extractTitleAndHeadings(body: string): { title: string; headings: string[] } {
  const headings: string[] = []
  let title = ''

  for (const line of body.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (!m) continue
    const text = m[2].trim()
    headings.push(text)
    if (!title && m[1] === '#') title = text
  }

  return { title: title || headings[0] || 'Untitled', headings }
}

/** Scan `docs/` into a lightweight inventory the agent can reason over. */
export function loadDocsInventory(
  repoRoot: string,
  docsDir = 'docs',
): DocEntry[] {
  const absDocs = path.join(repoRoot, docsDir)
  const paths: string[] = []
  walkMarkdown(absDocs, repoRoot, paths)

  return paths.sort().map((rel) => {
    const raw = fs.readFileSync(path.join(repoRoot, rel), 'utf8')
    const { covers, body } = parseFrontmatter(raw)
    const { title, headings } = extractTitleAndHeadings(body)
    const excerpt = body
      .replace(/^#.*$/m, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280)

    return {
      path: rel,
      title,
      headings,
      covers,
      excerpt,
      bodyWithoutFrontmatter: body,
    }
  })
}

export function inventorySummary(docs: DocEntry[]): string {
  return docs
    .map((d) => {
      const covers =
        d.covers.length > 0 ? ` covers=[${d.covers.join(', ')}]` : ''
      const heads = d.headings.slice(0, 6).join(' | ')
      return `- \`${d.path}\` — ${d.title}${covers}\n  headings: ${heads || '(none)'}\n  excerpt: ${d.excerpt || '(empty)'}`
    })
    .join('\n')
}
