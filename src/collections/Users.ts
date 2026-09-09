import type { CollectionConfig } from 'payload'

import { getUserRole, isAdmin, usersReadAccess, usersUpdateAccess } from '../access/roles'
import type { User } from '../payload-types'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
    description:
      'Admins can invite users and manage roles. Editors can only edit their own profile.',
  },
  auth: true,
  access: {
    admin: ({ req: { user } }) => Boolean(user),
    create: isAdmin,
    delete: isAdmin,
    read: usersReadAccess,
    update: usersUpdateAccess,
  },
  hooks: {
    beforeChange: [
      async ({ req, data, operation, originalDoc }) => {
        if (!data) return data

        if (operation === 'create') {
          const existing = await req.payload.find({
            collection: 'users',
            limit: 1,
            depth: 0,
          })
          if (existing.totalDocs === 0) {
            data.role = 'admin'
          } else if (!data.role) {
            data.role = 'editor'
          }
        }

        if (operation === 'update' && originalDoc && data.role !== undefined) {
          const actorIsAdmin = getUserRole(req.user as User) === 'admin'
          if (!actorIsAdmin && data.role !== originalDoc.role) {
            data.role = originalDoc.role
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      admin: {
        description:
          'Display name shown as the author on posts you edit. Falls back to email if empty.',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      admin: {
        description:
          'Admin: manage users, categories, tags, media. Editor: create posts and folders only. Only admins can change this.',
      },
    },
  ],
}
