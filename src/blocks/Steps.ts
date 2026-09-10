import type { Block } from 'payload'
import {
  BoldFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

/**
 * Numbered how-to steps rendered as cards on the public article page.
 */
export const Steps: Block = {
  slug: 'steps',
  labels: {
    singular: 'Steps',
    plural: 'Steps',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Steps',
      admin: {
        description: 'Section title shown above the list (optional).',
      },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      labels: {
        singular: 'Step',
        plural: 'Steps',
      },
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: {
            description: 'Short action line, e.g. “Create the user”.',
          },
        },
        {
          name: 'description',
          type: 'richText',
          editor: lexicalEditor({
            features: () => [
              ParagraphFeature(),
              BoldFeature(),
              ItalicFeature(),
              LinkFeature(),
              InlineToolbarFeature(),
            ],
          }),
          admin: {
            description: 'Optional supporting detail. Use the toolbar to add links.',
          },
        },
      ],
    },
  ],
}
