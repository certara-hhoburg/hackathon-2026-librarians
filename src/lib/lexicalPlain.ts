type LexicalNode = {
  type?: string
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  text?: string
  [key: string]: unknown
}

type LexicalData = {
  root: LexicalNode
  [key: string]: unknown
}

/** Build a minimal Lexical document from plain text (for migrating textarea → richText). */
export function plainTextToLexical(text: string): LexicalData {
  const normalized = text.replace(/\r\n/g, '\n').trimEnd()
  const paragraphs = normalized.length > 0 ? normalized.split(/\n+/).filter((p) => p.length > 0) : ['']

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((paragraph) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: paragraph,
            version: 1,
          },
        ],
      })),
    },
  }
}

function migrateStepsDescriptionsInNode(node: LexicalNode): boolean {
  let changed = false

  if (node.type === 'block' && node.fields?.blockType === 'steps') {
    const items = node.fields.items
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        if (typeof row.description === 'string') {
          row.description = plainTextToLexical(row.description)
          changed = true
        }
      }
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (migrateStepsDescriptionsInNode(child)) changed = true
    }
  }

  return changed
}

/** Convert legacy plain-string Steps descriptions to Lexical objects in post content. */
export function migrateStepsDescriptionsInContent(content: unknown): unknown {
  if (!content || typeof content !== 'object') return content
  const data = content as LexicalData
  if (!data.root || typeof data.root !== 'object') return content
  migrateStepsDescriptionsInNode(data.root)
  return data
}
