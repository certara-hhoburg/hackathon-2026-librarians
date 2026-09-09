import { BackButton } from '@/components/BackButton'
import Link from 'next/link'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import config from '@/payload.config'

type Args = {
  params: Promise<{ slug: string }>
}

export default async function TagPage({ params }: Readonly<Args>) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })

  const { docs: tags } = await payload.find({
    collection: 'tags',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const tag = tags[0]
  if (!tag) notFound()

  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { status: { equals: 'published' } },
        { tags: { contains: tag.id } },
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
      <h1>Tag: {tag.name}</h1>
      {tag.description ? <p className="lede">{tag.description}</p> : null}
      <ul className="posts">
        {posts.length === 0 ? (
          <li className="empty">No published posts with this tag yet.</li>
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
