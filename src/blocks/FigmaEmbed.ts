import type { Block } from 'payload'

/**
 * Inline Lexical block: embed a Figma file/prototype via the official iframe embed.
 * Editors paste a Share link (Anyone with the link).
 */
export const FigmaEmbed: Block = {
  slug: 'figmaEmbed',
  labels: {
    singular: 'Figma embed',
    plural: 'Figma embeds',
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        description:
          'Figma Share link (File → Share → Copy link). Must be viewable by “anyone with the link”.',
      },
      validate: (value: string | null | undefined) => {
        if (!value) return 'A Figma URL is required'
        try {
          const parsed = new URL(value)
          const host = parsed.hostname.replace(/^www\./, '')
          if (host !== 'figma.com') return 'URL must be a figma.com link'
          return true
        } catch {
          return 'Enter a valid URL'
        }
      },
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional caption shown above the embed.',
      },
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: 450,
      min: 200,
      max: 1200,
      admin: {
        description: 'Embed height in pixels (default 450).',
      },
    },
  ],
}
