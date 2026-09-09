import { BackButton } from '@/components/BackButton'
import Link from 'next/link'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import config from '@/payload.config'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: Readonly<Args>) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })

  const { docs: categories } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const category = categories[0]
  if (!category) notFound()

  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { status: { equals: 'published' } },
        { category: { equals: category.id } },
      ],
    },
    limit: 50,
    sort: 'sortOrder',
  })

  return (
    <div className="page">
      <p className="eyebrow">
        <BackButton />
      </p>
      <h1>{category.name}</h1>
      {category.description ? <p className="lede">{category.description}</p> : null}
      <ul className="posts">
        {posts.length === 0 ? (
          <li className="empty">No published posts in this category yet.</li>
        ) : (
          posts.map((post) => (
            <li key={post.id}>
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
              {post.summary ? (
                <div className="post-meta">
                  <span className="post-summary">{post.summary}</span>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
