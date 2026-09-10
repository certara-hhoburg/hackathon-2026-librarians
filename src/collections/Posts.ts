import type { CollectionConfig } from 'payload'
import { BlocksFeature, FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { anyone, isAdminOrEditor } from '../access/roles'
import { FigmaEmbed } from '../blocks/FigmaEmbed'
import { RecipeEmbed } from '../blocks/RecipeEmbed'
import { Steps } from '../blocks/Steps'
import { slugify } from '../lib/slugify'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'lastEditedBy', 'status', 'updatedAt'],
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: {
    beforeChange: [
      ({ req, data }) => {
        if (req.user?.id != null && data) {
          data.lastEditedBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.length > 0) return slugify(value)
            if (data?.title) return slugify(String(data.title))
            return value
          },
        ],
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Short blurb shown in listings and recipe embed cards.',
      },
    },
    {
      name: 'folder',
      type: 'relationship',
      relationTo: 'folders',
      admin: {
        position: 'sidebar',
        description: 'Optional nested folder for the public left navigation.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        position: 'sidebar',
        description: 'e.g. Technical or Recipe',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Order within a folder (lower first).',
      },
    },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          FixedToolbarFeature(),
          BlocksFeature({
            blocks: [RecipeEmbed, FigmaEmbed, Steps],
          }),
        ],
      }),
    },
    {
      name: 'includes',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description:
          'Recipes / guides this page depends on. Shown as related how-tos below the article (in addition to any inline embeds).',
      },
      filterOptions: ({ id }) => {
        if (!id) return true
        return {
          id: {
            not_equals: id,
          },
        }
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'lastEditedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Automatically set to the user who last saved this post.',
      },
    },
  ],
}
