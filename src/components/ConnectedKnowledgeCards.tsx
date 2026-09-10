'use client'

import Link from 'next/link'
import React, { useState } from 'react'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'

import type { Post } from '@/payload-types'

export type KnowledgeCardIcon = 'document' | 'book' | 'building' | 'globe' | 'link'
export type KnowledgeCardKind = 'external' | 'post' | 'expand'

export type KnowledgeCardItem = {
  id?: string
  title: string
  description?: string | null
  icon?: KnowledgeCardIcon | null
  kind: KnowledgeCardKind
  url?: string | null
  relatedPost?: number | Post | null
  expandBody?: Post['content'] | null
}

function CardIcon({ name }: { name: KnowledgeCardIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    case 'building':
      return (
        <svg {...common}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
    case 'link':
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      )
  }
}

function CardFace({
  item,
  trailing,
}: {
  item: KnowledgeCardItem
  trailing?: React.ReactNode
}) {
  const icon = item.icon || 'document'
  return (
    <>
      <span className={`knowledge-card-icon icon-${icon}`}>
        <CardIcon name={icon} />
      </span>
      <span className="knowledge-card-text">
        <span className="knowledge-card-title">{item.title}</span>
        {item.description ? <span className="knowledge-card-desc">{item.description}</span> : null}
        {trailing}
      </span>
    </>
  )
}

function ExpandableCard({ item }: { item: KnowledgeCardItem }) {
  const [open, setOpen] = useState(false)
  const body =
    item.expandBody && typeof item.expandBody === 'object' && 'root' in item.expandBody
      ? item.expandBody
      : null

  return (
    <div className={`knowledge-card expand${open ? ' open' : ''}`}>
      <button type="button" className="knowledge-card-hit" onClick={() => setOpen((v) => !v)}>
        <CardFace
          item={item}
          trailing={
            <span className="knowledge-card-action">{open ? 'Collapse' : 'Expand'}</span>
          }
        />
      </button>
      {open && body ? (
        <div className="knowledge-card-expand-body">
          <LexicalRichText data={body} />
        </div>
      ) : null}
    </div>
  )
}

export function ConnectedKnowledgeCards({
  heading,
  items,
}: {
  heading?: string | null
  items: KnowledgeCardItem[]
}) {
  const cards = items.filter((item) => item?.title)
  if (cards.length === 0) return null

  const title = (heading || '').trim() || 'Connected knowledge'

  return (
    <section className="knowledge-block">
      <h2 className="knowledge-heading">{title}</h2>
      <ul className="knowledge-list">
        {cards.map((item, index) => {
          const key = item.id || `${item.title}-${index}`

          if (item.kind === 'expand') {
            return (
              <li key={key}>
                <ExpandableCard item={item} />
              </li>
            )
          }

          if (item.kind === 'post') {
            const post = item.relatedPost
            if (!post || typeof post === 'number') {
              return (
                <li key={key}>
                  <div className="knowledge-card missing">
                    <CardFace item={{ ...item, description: item.description || 'Article unavailable' }} />
                  </div>
                </li>
              )
            }
            return (
              <li key={key}>
                <Link className="knowledge-card" href={`/posts/${post.slug}`}>
                  <CardFace
                    item={{
                      ...item,
                      description: item.description || post.summary || 'Open related article',
                    }}
                  />
                </Link>
              </li>
            )
          }

          const href = (item.url || '').trim()
          if (!href) {
            return (
              <li key={key}>
                <div className="knowledge-card missing">
                  <CardFace item={{ ...item, description: 'Missing URL' }} />
                </div>
              </li>
            )
          }

          return (
            <li key={key}>
              <a
                className="knowledge-card"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CardFace
                  item={{
                    ...item,
                    description: item.description || 'Opens in a new tab',
                  }}
                />
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
