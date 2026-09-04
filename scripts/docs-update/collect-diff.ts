import { execFileSync } from 'node:child_process'

export type DiffResult = {
  files: string[]
  patch: string
  base: string
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function resolveBaseRef(repoRoot: string, baseArg?: string): string {
  if (baseArg) return baseArg

  if (process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`
  }

  try {
    git(['rev-parse', '--verify', 'origin/main'], repoRoot)
    return 'origin/main'
  } catch {
    try {
      git(['rev-parse', '--verify', 'main'], repoRoot)
      return 'main'
    } catch {
      return 'HEAD~1'
    }
  }
}

/**
 * Collect changed files and a unified patch vs a base ref.
 * Falls back to working-tree changes when the base is not available.
 */
export function collectDiff(repoRoot: string, baseArg?: string): DiffResult {
  const base = resolveBaseRef(repoRoot, baseArg)

  try {
    const mergeBase = git(['merge-base', base, 'HEAD'], repoRoot)
    const filesRaw = git(['diff', '--name-only', `${mergeBase}...HEAD`], repoRoot)
    const patch = git(['diff', '--unified=5', `${mergeBase}...HEAD`], repoRoot)
    const files = filesRaw
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    if (files.length > 0) {
      return { files, patch, base: `${mergeBase} (${base})` }
    }
  } catch {
    // Fall through to working tree
  }

  const unstagedFiles = git(['diff', '--name-only'], repoRoot)
  const stagedFiles = git(['diff', '--name-only', '--cached'], repoRoot)
  const untracked = git(['ls-files', '--others', '--exclude-standard'], repoRoot)
  const files = [
    ...new Set(
      [...unstagedFiles.split('\n'), ...stagedFiles.split('\n'), ...untracked.split('\n')]
        .map((f) => f.trim())
        .filter(Boolean),
    ),
  ]

  const patchParts = [
    git(['diff', '--unified=5'], repoRoot),
    git(['diff', '--unified=5', '--cached'], repoRoot),
  ].filter(Boolean)

  return {
    files,
    patch: patchParts.join('\n\n'),
    base: 'working-tree',
  }
}
