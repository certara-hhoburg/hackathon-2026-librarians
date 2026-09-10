import { ArticleRichText } from '@/components/ArticleRichText'
import { BackButton } from '@/components/BackButton'
import config from '@/payload.config'
import type { Category, Folder, Post, Tag } from '@/payload-types'
import { getPayload } from 'payload'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

type Args = {
  params: Promise<{ slug: string }>
}

function isPopulatedPost(value: number | Post): value is Post {
  return typeof value === 'object' && value !== null && 'title' in value
}

/** Normalize taxonomy labels so near-duplicates (e.g. Glossary / Glossaries) collapse. */
function taxonomyKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/ies\b/g, 'y')
    .replace(/(?<![s])s\b/g, '')
}

export default async function PostPage({ params }: Readonly<Args>) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })

  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: 'published' } },
      ],
    },
    depth: 2,
    limit: 1,
  })

  const post = docs[0]
  if (!post) notFound()

  const category =
    post.category && typeof post.category === 'object' ? (post.category as Category) : null
  const folder = post.folder && typeof post.folder === 'object' ? (post.folder as Folder) : null
  const allTags = (post.tags || []).filter((t): t is Tag => typeof t === 'object' && t !== null)

  const seen = new Set<string>()
  if (category) seen.add(taxonomyKey(category.name))
  const showFolder = Boolean(folder && !seen.has(taxonomyKey(folder.name)))
  if (folder && showFolder) seen.add(taxonomyKey(folder.name))
  const tags = allTags.filter((tag) => {
    const key = taxonomyKey(tag.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const includes = (post.includes || []).filter(isPopulatedPost)
  const manualUsedIn = (post.usedAsStepIn || []).filter(isPopulatedPost)

  const { docs: reverseParents } = await payload.find({
    collection: 'posts',
    where: {
      and: [
        { status: { equals: 'published' } },
        { includes: { contains: post.id } },
        { id: { not_equals: post.id } },
      ],
    },
    depth: 0,
    limit: 50,
    sort: 'title',
  })

  const usedAsStepInMap = new Map<number, Post>()
  for (const parent of [...manualUsedIn, ...reverseParents]) {
    if (parent.status && parent.status !== 'published') continue
    usedAsStepInMap.set(parent.id, parent)
  }
  const usedAsStepIn = [...usedAsStepInMap.values()]

  const author =
    post.lastEditedBy && typeof post.lastEditedBy === 'object' ? post.lastEditedBy : null
  const authorName =
    author && 'name' in author && author.name
      ? author.name
      : author && 'email' in author
        ? author.email
        : null

  return (
    <article className="content post">
      <p className="eyebrow">
        <BackButton />
      </p>

      <div className="taxonomies">
        {category ? (
          <Link className="pill category" href={`/categories/${category.slug}`} title="Category">
            {category.name}
          </Link>
        ) : null}
        {showFolder && folder ? (
          <Link className="pill folder" href={`/?folder=${folder.slug}`} title="Folder">
            {folder.name}
          </Link>
        ) : null}
        {tags.map((tag) => (
          <Link className="pill tag" href={`/tags/${tag.slug}`} key={tag.id} title="Tag">
            {tag.name}
          </Link>
        ))}
      </div>

      <h1 id="top">{post.title}</h1>
      <p className="meta">
        {authorName ? (
          <>
            By <span className="author">{authorName}</span>
            {' · '}
          </>
        ) : null}
        Updated {new Date(post.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
      </p>
      {post.summary ? <p className="lede">{post.summary}</p> : null}

      {post.content ? (
        <div className="body">
          <ArticleRichText data={post.content} />
        </div>
      ) : (
        <p className="empty">This post has no content yet.</p>
      )}

      {includes.length > 0 ? (
        <section className="includes">
          <h2 id="included-guides" className="anchored-heading">
            <a className="heading-anchor" href="#included-guides" aria-label="Link to included-guides">
              #
            </a>
            Included Articles
          </h2>
          <ul>
            {includes.map((guide) => (
              <li key={guide.id}>
                <Link href={`/posts/${guide.slug}`}>{guide.title}</Link>
                {guide.summary ? <p>{guide.summary}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {usedAsStepIn.length > 0 ? (
        <section className="used-as-step-in">
          <h2 id="used-as-step-in" className="anchored-heading">
            <a className="heading-anchor" href="#used-as-step-in" aria-label="Link to used-as-step-in">
              #
            </a>
            Used as a step in
          </h2>
          <ul className="used-as-step-in-list">
            {usedAsStepIn.map((parent) => (
              <li key={parent.id} className="used-as-step-in-card">
                <Link href={`/posts/${parent.slug}`}>{parent.title}</Link>
                <p>
                  {parent.summary?.trim() ||
                    'This procedure is embedded there rather than duplicated.'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
