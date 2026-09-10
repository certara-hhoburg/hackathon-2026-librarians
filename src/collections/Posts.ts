import type { CollectionConfig } from 'payload'
import { BlocksFeature, FixedToolbarFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { anyone, isAdminOrEditor } from '../access/roles'
import { ConnectedKnowledge } from '../blocks/ConnectedKnowledge'
import { FigmaEmbed } from '../blocks/FigmaEmbed'
import { RecipeEmbed } from '../blocks/RecipeEmbed'
import { Steps } from '../blocks/Steps'
import { migrateStepsDescriptionsInContent } from '../lib/lexicalPlain'
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
    afterRead: [
      ({ doc }) => {
        if (doc?.content) {
          doc.content = migrateStepsDescriptionsInContent(doc.content)
        }
        return doc
      },
    ],
    beforeChange: [
      ({ req, data }) => {
        if (!data) return data
        if (req.user?.id != null) {
          data.lastEditedBy = req.user.id
        }
        if (data.content) {
          data.content = migrateStepsDescriptionsInContent(data.content)
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
            blocks: [RecipeEmbed, FigmaEmbed, Steps, ConnectedKnowledge],
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
          'Shorter recipes/guides this page depends on. Those pages will list this one under “Used as a step in”.',
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
      name: 'usedAsStepIn',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      admin: {
        description:
          'Optional. Larger guides that use this procedure (e.g. via a Recipe embed). Also auto-filled on the public page from posts that list this one under Includes.',
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
      name: 'recommendedLearning',
      type: 'array',
      labels: {
        singular: 'Learning link',
        plural: 'Recommended learning',
      },
      admin: {
        description:
          'Optional right-rail “Recommended learning” cards on the public post page. Leave empty to hide the rail.',
      },
      fields: [
        {
          name: 'brand',
          type: 'text',
          required: true,
          admin: {
            description: 'Source name shown above the link, e.g. “USDM Play”.',
          },
        },
        {
          name: 'blurb',
          type: 'text',
          admin: {
            description: 'Short line under the brand, e.g. “Learn CDISC USDM through interactive examples”.',
          },
        },
        {
          name: 'linkLabel',
          type: 'text',
          required: true,
          admin: {
            description: 'Clickable link text.',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            description: 'External URL (https://…). Use this or Related article.',
          },
        },
        {
          name: 'relatedPost',
          type: 'relationship',
          relationTo: 'posts',
          admin: {
            description: 'Optional internal article instead of an external URL.',
          },
          filterOptions: ({ id }) => {
            if (!id) return true
            return { id: { not_equals: id } }
          },
        },
      ],
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
