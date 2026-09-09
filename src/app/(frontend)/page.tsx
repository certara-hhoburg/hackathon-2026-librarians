import type { Where } from 'payload'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'

type SearchParams = Promise<{ tag?: string; category?: string; folder?: string }>

export default async function HomePage({
  searchParams,
}: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams
  const payload = await getPayload({ config: await config })

  const [{ docs: categories }, { docs: tags }, { docs: folders }] = await Promise.all([
    payload.find({ collection: 'categories', limit: 500, sort: 'name' }),
    payload.find({ collection: 'tags', limit: 500, sort: 'name' }),
    payload.find({ collection: 'folders', limit: 500, sort: 'name' }),
  ])

  const and: Where[] = [{ status: { equals: 'published' } }]

  const activeCategory = params.category
    ? categories.find((c) => c.slug === params.category)
    : null
  const activeTag = params.tag ? tags.find((t) => t.slug === params.tag) : null
  const activeFolder = params.folder ? folders.find((f) => f.slug === params.folder) : null

  if (activeCategory) and.push({ category: { equals: activeCategory.id } })
  if (activeTag) and.push({ tags: { contains: activeTag.id } })
  if (activeFolder) and.push({ folder: { equals: activeFolder.id } })

  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: { and },
    depth: 1,
    limit: 100,
    sort: 'sortOrder',
  })

  const hasFilters = Boolean(activeCategory || activeTag || activeFolder)

  return (
    <div className="page">
      <p className="eyebrow">Documentation</p>
      <h1>Browse articles</h1>
      <p className="lede">
        Use the header filters to narrow results, or search to jump to an article. The sidebar
        always shows the full library.
      </p>

      {hasFilters ? (
        <div className="active-filters">
          <span className="filter-label">Active</span>
          {activeCategory ? (
            <span className="pill category active">{activeCategory.name}</span>
          ) : null}
          {activeTag ? <span className="pill tag active">{activeTag.name}</span> : null}
          {activeFolder ? <span className="pill active">{activeFolder.name}</span> : null}
          <Link className="filter-clear-link" href="/">
            Clear all
          </Link>
        </div>
      ) : null}

      <ul className="posts">
        {posts.length === 0 ? (
          <li className="empty">No published posts match these filters.</li>
        ) : (
          posts.map((post) => {
            const category =
              post.category && typeof post.category === 'object' ? post.category : null
            const folder = post.folder && typeof post.folder === 'object' ? post.folder : null
            return (
              <li key={post.id}>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
                <div className="post-meta">
                  {folder ? <span className="pill">{folder.name}</span> : null}
                  {category ? <span className="pill category">{category.name}</span> : null}
                  {post.summary ? <span className="post-summary">{post.summary}</span> : null}
                </div>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
