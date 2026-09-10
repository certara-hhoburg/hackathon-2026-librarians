import type { Block } from 'payload'
import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

const miniRichText = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature(),
    InlineToolbarFeature(),
  ],
})

/**
 * Clickable resource cards (external links, related posts, or expandable notes).
 */
export const ConnectedKnowledge: Block = {
  slug: 'connectedKnowledge',
  labels: {
    singular: 'Connected knowledge',
    plural: 'Connected knowledge',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Connected knowledge',
      admin: {
        description: 'Section title above the cards (optional).',
      },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      labels: {
        singular: 'Card',
        plural: 'Cards',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          admin: {
            description: 'Short caption under the title (e.g. “Opens in a new tab”).',
          },
        },
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'document',
          options: [
            { label: 'Document', value: 'document' },
            { label: 'Book', value: 'book' },
            { label: 'Building', value: 'building' },
            { label: 'Globe', value: 'globe' },
            { label: 'Link', value: 'link' },
          ],
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'external',
          options: [
            { label: 'External link', value: 'external' },
            { label: 'Related article', value: 'post' },
            { label: 'Expandable note', value: 'expand' },
          ],
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.kind === 'external',
            description: 'https://… — opens in a new tab.',
          },
        },
        {
          name: 'relatedPost',
          type: 'relationship',
          relationTo: 'posts',
          admin: {
            condition: (_, siblingData) => siblingData?.kind === 'post',
          },
        },
        {
          name: 'expandBody',
          type: 'richText',
          editor: miniRichText,
          admin: {
            condition: (_, siblingData) => siblingData?.kind === 'expand',
            description: 'Shown when the reader expands this card.',
          },
        },
      ],
    },
  ],
}
