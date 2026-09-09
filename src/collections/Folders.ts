import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access/roles'
import { slugify } from '../lib/slugify'

export const Folders: CollectionConfig = {
  slug: 'folders',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'parent', 'sortOrder', 'updatedAt'],
    description: 'Nested folders for organizing documentation in the public sidebar.',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'name',
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
            if (data?.name) return slugify(String(data.name))
            return value
          },
        ],
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'folders',
      admin: {
        description: 'Leave empty for a top-level folder. Nest by choosing a parent.',
      },
      filterOptions: ({ id }) => {
        if (!id) return true
        return { id: { not_equals: id } }
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first among siblings.',
      },
    },
  ],
}
