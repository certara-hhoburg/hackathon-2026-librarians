import type { Access } from 'payload'

import type { User } from '@/payload-types'

export type UserRole = 'admin' | 'editor'

export function getUserRole(user: User | null | undefined): UserRole | null {
  if (!user) return null
  return (user.role as UserRole | undefined) || 'editor'
}

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => getUserRole(user as User) === 'admin'

export const isAdminOrEditor: Access = ({ req: { user } }) => {
  const role = getUserRole(user as User)
  return role === 'admin' || role === 'editor'
}

export const anyone: Access = () => true

/** Admins see all users; editors only see themselves. */
export const usersReadAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (getUserRole(user as User) === 'admin') return true
  return { id: { equals: user.id } }
}

/** Admins update anyone; editors update themselves only. */
export const usersUpdateAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (getUserRole(user as User) === 'admin') return true
  return { id: { equals: user.id } }
}
