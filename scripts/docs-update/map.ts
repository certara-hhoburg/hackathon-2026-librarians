import path from 'node:path'

export type DocMapping = {
  pattern: RegExp
  docs: string[]
  reason: string
}

/** Heuristic: changed source paths → documentation that may need updates. */
export const DOC_MAPPINGS: DocMapping[] = [
  {
    pattern: /(^|\/)src\/collections\/Posts(\.|\/)/,
    docs: ['docs/collections/posts.md'],
    reason: 'Posts collection definition changed',
  },
  {
    pattern: /(^|\/)src\/collections\/(Users|Media)(\.|\/)/,
    docs: ['docs/admin/overview.md', 'docs/development/local-setup.md'],
    reason: 'Core collection definition changed',
  },
  {
    pattern: /(^|\/)src\/payload\.config\.(ts|js)$/,
    docs: [
      'docs/collections/posts.md',
      'docs/admin/overview.md',
      'docs/development/local-setup.md',
    ],
    reason: 'Payload config changed',
  },
  {
    pattern: /(^|\/)src\/app\/\(payload\)\//,
    docs: ['docs/admin/overview.md'],
    reason: 'Admin / Payload app routes changed',
  },
  {
    pattern: /(^|\/)src\/app\/\(frontend\)\//,
    docs: ['docs/collections/posts.md', 'docs/admin/overview.md'],
    reason: 'Public frontend changed (may affect documented usage)',
  },
  {
    pattern: /(^|\/)(package\.json|\.env\.example)$/,
    docs: ['docs/development/local-setup.md'],
    reason: 'Dependencies or env template changed',
  },
  {
    pattern: /(^|\/)next\.config\.(ts|js|mjs)$/,
    docs: ['docs/development/local-setup.md', 'docs/admin/overview.md'],
    reason: 'Next.js config changed',
  },
]

export type MappedChange = {
  file: string
  docs: string[]
  reasons: string[]
}

export function mapChangedFiles(files: string[]): {
  mapped: MappedChange[]
  uniqueDocs: string[]
  unmapped: string[]
} {
  const mapped: MappedChange[] = []
  const docsSet = new Set<string>()
  const unmapped: string[] = []

  for (const file of files) {
    const normalized = file.replaceAll('\\', '/')
    const reasons: string[] = []
    const docsForFile = new Set<string>()

    for (const mapping of DOC_MAPPINGS) {
      if (mapping.pattern.test(normalized)) {
        reasons.push(mapping.reason)
        for (const doc of mapping.docs) {
          docsForFile.add(doc)
          docsSet.add(doc)
        }
      }
    }

    if (docsForFile.size === 0) {
      unmapped.push(normalized)
    } else {
      mapped.push({
        file: normalized,
        docs: [...docsForFile],
        reasons: [...new Set(reasons)],
      })
    }
  }

  return {
    mapped,
    uniqueDocs: [...docsSet].sort(),
    unmapped,
  }
}

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.join(repoRoot, relativePath)
}
