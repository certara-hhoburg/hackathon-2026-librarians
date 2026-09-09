import type { Folder, Post } from '@/payload-types'

export type NavPost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  folderId: number | null
  sortOrder: number
  categoryName?: string | null
}

export type NavFolder = {
  id: number
  name: string
  slug: string
  parentId: number | null
  sortOrder: number
}

export type NavTreeNode = {
  folder: NavFolder
  children: NavTreeNode[]
  posts: NavPost[]
}

export type NavData = {
  tree: NavTreeNode[]
  unfiled: NavPost[]
  allPosts: NavPost[]
}

function folderIdOf(post: Post): number | null {
  if (post.folder == null) return null
  if (typeof post.folder === 'number') return post.folder
  return post.folder.id
}

function parentIdOf(folder: Folder): number | null {
  if (folder.parent == null) return null
  if (typeof folder.parent === 'number') return folder.parent
  return folder.parent.id
}

export function toNavPost(post: Post): NavPost {
  const categoryName =
    post.category && typeof post.category === 'object' ? post.category.name : null

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    folderId: folderIdOf(post),
    sortOrder: post.sortOrder ?? 0,
    categoryName,
  }
}

export function toNavFolder(folder: Folder): NavFolder {
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    parentId: parentIdOf(folder),
    sortOrder: folder.sortOrder ?? 0,
  }
}

export function buildNavTree(folders: NavFolder[], posts: NavPost[]): NavData {
  const sortedFolders = [...folders].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )
  const sortedPosts = [...posts].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
  )

  const byParent = new Map<number | null, NavFolder[]>()
  for (const folder of sortedFolders) {
    const list = byParent.get(folder.parentId) || []
    list.push(folder)
    byParent.set(folder.parentId, list)
  }

  const postsByFolder = new Map<number | null, NavPost[]>()
  for (const post of sortedPosts) {
    const list = postsByFolder.get(post.folderId) || []
    list.push(post)
    postsByFolder.set(post.folderId, list)
  }

  function build(parentId: number | null): NavTreeNode[] {
    return (byParent.get(parentId) || []).map((folder) => ({
      folder,
      children: build(folder.id),
      posts: postsByFolder.get(folder.id) || [],
    }))
  }

  return {
    tree: build(null),
    unfiled: postsByFolder.get(null) || [],
    allPosts: sortedPosts,
  }
}

export function filterNavData(nav: NavData, query: string): NavData {
  const q = query.trim().toLowerCase()
  if (!q) return nav

  const matchingIds = new Set(
    nav.allPosts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.summary || '').toLowerCase().includes(q) ||
          (p.categoryName || '').toLowerCase().includes(q),
      )
      .map((p) => p.id),
  )

  function filterTree(nodes: NavTreeNode[]): NavTreeNode[] {
    const result: NavTreeNode[] = []
    for (const node of nodes) {
      const children = filterTree(node.children)
      const posts = node.posts.filter((p) => matchingIds.has(p.id))
      if (children.length > 0 || posts.length > 0) {
        result.push({ ...node, children, posts })
      }
    }
    return result
  }

  return {
    tree: filterTree(nav.tree),
    unfiled: nav.unfiled.filter((p) => matchingIds.has(p.id)),
    allPosts: nav.allPosts.filter((p) => matchingIds.has(p.id)),
  }
}
