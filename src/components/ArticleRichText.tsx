import type { SerializedBlockNode, SerializedHeadingNode } from '@payloadcms/richtext-lexical'
import { type JSXConvertersFunction, RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import React from 'react'

import { toFigmaEmbedSrc } from '@/lib/figma'
import { lexicalPlainText, slugify } from '@/lib/slugify'
import type { Category, Post } from '@/payload-types'

type RecipeEmbedFields = {
  blockType: 'recipeEmbed'
  recipe: number | Post
  sectionAnchor?: string | null
  display?: 'card' | 'link' | null
}

type FigmaEmbedFields = {
  blockType: 'figmaEmbed'
  url: string
  title?: string | null
  height?: number | null
}

type StepsFields = {
  blockType: 'steps'
  heading?: string | null
  items?: Array<{
    id?: string
    title: string
    description?: string | null
  }> | null
}

type NodeTypes =
  | SerializedHeadingNode
  | SerializedBlockNode<RecipeEmbedFields>
  | SerializedBlockNode<FigmaEmbedFields>
  | SerializedBlockNode<StepsFields>

function postHref(post: Pick<Post, 'slug' | 'id'>, anchor?: string | null): string {
  const base = `/posts/${post.slug || post.id}`
  if (anchor) return `${base}#${slugify(anchor)}`
  return base
}

function RecipeEmbedView({ fields }: { fields: RecipeEmbedFields }) {
  const recipe = fields.recipe
  if (!recipe || typeof recipe === 'number') {
    return (
      <aside className="recipe-embed missing">
        <p>Embedded guide is unavailable (id {String(recipe)}).</p>
      </aside>
    )
  }

  const href = postHref(recipe, fields.sectionAnchor)
  const label = fields.sectionAnchor
    ? `${recipe.title} → ${fields.sectionAnchor}`
    : recipe.title

  if (fields.display === 'link') {
    return (
      <p className="recipe-embed-link">
        See also: <Link href={href}>{label}</Link>
      </p>
    )
  }

  const categoryName =
    recipe.category && typeof recipe.category === 'object'
      ? (recipe.category as Category).name
      : 'Related guide'

  return (
    <aside className="recipe-embed">
      <p className="recipe-embed-kicker">{categoryName}</p>
      <Link className="recipe-embed-title" href={href}>
        {recipe.title}
      </Link>
      {recipe.summary ? <p className="recipe-embed-summary">{recipe.summary}</p> : null}
    </aside>
  )
}

function FigmaEmbedView({ fields }: { fields: FigmaEmbedFields }) {
  const embedSrc = fields.url ? toFigmaEmbedSrc(fields.url) : null
  const height = Math.min(1200, Math.max(200, fields.height || 450))

  if (!embedSrc) {
    return (
      <aside className="figma-embed missing">
        <p>Invalid Figma URL. Use a figma.com share link.</p>
      </aside>
    )
  }

  return (
    <figure className="figma-embed">
      {fields.title ? <figcaption className="figma-embed-title">{fields.title}</figcaption> : null}
      <div className="figma-embed-frame" style={{ height }}>
        <iframe
          src={embedSrc}
          title={fields.title || 'Figma design'}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="figma-embed-open">
        <a href={fields.url} target="_blank" rel="noopener noreferrer">
          Open in Figma
        </a>
      </p>
    </figure>
  )
}

function StepsView({ fields }: { fields: StepsFields }) {
  const items = (fields.items || []).filter((item) => item?.title)
  if (items.length === 0) return null

  const heading = (fields.heading || '').trim() || 'Steps'

  return (
    <section className="steps-block">
      <h2 className="steps-heading">{heading}</h2>
      <ol className="steps-list">
        {items.map((item, index) => (
          <li key={item.id || `${item.title}-${index}`} className="steps-item">
            <span className="steps-number" aria-hidden>
              {index + 1}
            </span>
            <div className="steps-body">
              <p className="steps-title">{item.title}</p>
              {item.description ? <p className="steps-description">{item.description}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    const id = slugify(lexicalPlainText(node))
    const Tag = node.tag

    return (
      <Tag id={id} className="anchored-heading">
        <a className="heading-anchor" href={`#${id}`} aria-label={`Link to ${id}`}>
          #
        </a>
        {children}
      </Tag>
    )
  },
  blocks: {
    recipeEmbed: ({ node }) => <RecipeEmbedView fields={node.fields} />,
    figmaEmbed: ({ node }) => <FigmaEmbedView fields={node.fields} />,
    steps: ({ node }) => <StepsView fields={node.fields} />,
  },
})

type Props = {
  data: NonNullable<Post['content']>
}

export function ArticleRichText({ data }: Props) {
  return <LexicalRichText converters={jsxConverters} data={data} />
}
