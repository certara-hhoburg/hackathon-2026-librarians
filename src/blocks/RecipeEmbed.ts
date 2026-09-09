import type { Block } from 'payload'

export const RecipeEmbed: Block = {
  slug: 'recipeEmbed',
  labels: {
    singular: 'Recipe / guide embed',
    plural: 'Recipe / guide embeds',
  },
  fields: [
    {
      name: 'recipe',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: {
        description: 'Usually a post in the Recipe category, but any published guide works.',
      },
    },
    {
      name: 'sectionAnchor',
      type: 'text',
      admin: {
        description:
          'Optional heading id inside that guide (e.g. "reset-password"). Linked as /posts/{slug}#{anchor}.',
      },
    },
    {
      name: 'display',
      type: 'select',
      defaultValue: 'card',
      options: [
        { label: 'Card with summary link', value: 'card' },
        { label: 'Inline link only', value: 'link' },
      ],
    },
  ],
}
