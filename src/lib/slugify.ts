export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

type LexicalLike = {
  text?: string
  children?: unknown[]
}

/** Flatten Lexical node children into plain text (for heading anchors). */
export function lexicalPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as LexicalLike
  if (typeof n.text === 'string') return n.text
  if (!Array.isArray(n.children)) return ''
  return n.children.map(lexicalPlainText).join('')
}
