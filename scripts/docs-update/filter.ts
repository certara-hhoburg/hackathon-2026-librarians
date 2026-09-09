import path from 'node:path'

/** Always drop these from consideration. */
const IGNORE_PATTERNS: RegExp[] = [
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)docs-update-output\//,
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /\.db(-shm|-wal)?$/,
  /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp4|map)$/i,
  /(^|\/)src\/payload-types\.ts$/,
  /(^|\/)src\/app\/\(payload\)\/admin\/importMap\.js$/,
  /(^|\/)\.git\//,
]

/**
 * Only these paths are fed to the triage agent as "code changed".
 * Docs/CI/script edits are listed separately so self-edits don't select every page.
 */
const TRIAGE_PATTERNS: RegExp[] = [
  /(^|\/)src\//,
  /(^|\/)package\.json$/,
  /(^|\/)\.env\.example$/,
  /(^|\/)next\.config\.(ts|js|mjs|mts)$/,
]

export function normalizePath(file: string): string {
  return file.replaceAll('\\', '/')
}

export function isIgnoredPath(file: string): boolean {
  const normalized = normalizePath(file)
  return IGNORE_PATTERNS.some((re) => re.test(normalized))
}

export function isTriagePath(file: string): boolean {
  const normalized = normalizePath(file)
  if (isIgnoredPath(normalized)) return false
  return TRIAGE_PATTERNS.some((re) => re.test(normalized))
}

/** Split changes into triage inputs vs everything else. */
export function filterChangedFiles(files: string[]): {
  relevant: string[]
  ignored: string[]
  other: string[]
} {
  const relevant: string[] = []
  const ignored: string[] = []
  const other: string[] = []

  for (const file of files) {
    const normalized = normalizePath(file)
    if (isIgnoredPath(normalized)) ignored.push(normalized)
    else if (isTriagePath(normalized)) relevant.push(normalized)
    else other.push(normalized)
  }

  return { relevant, ignored, other }
}

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.join(repoRoot, relativePath)
}

/** Simple glob match: `*`, `**`, and `?` supported. */
export function matchGlob(pattern: string, filePath: string): boolean {
  const normalizedPattern = normalizePath(pattern)
  const normalizedFile = normalizePath(filePath)

  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLESTAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/::DOUBLESTAR::/g, '.*')

  return new RegExp(`^${escaped}$`).test(normalizedFile)
}
