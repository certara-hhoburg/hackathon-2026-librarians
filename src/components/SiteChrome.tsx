'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

import { SearchFilters, type FilterOption } from '@/components/SearchFilters'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { NavData, NavPost, NavTreeNode } from '@/lib/nav'

type Props = {
  nav: NavData
  adminUrl: string
  categories: FilterOption[]
  tags: FilterOption[]
  folders: FilterOption[]
  children: React.ReactNode
}

function PostLink({ post, active }: { post: NavPost; active: boolean }) {
  return (
    <Link className={`nav-post${active ? ' active' : ''}`} href={`/posts/${post.slug}`}>
      {post.title}
    </Link>
  )
}

function FolderNodeView({
  node,
  activeSlug,
  depth,
}: {
  node: NavTreeNode
  activeSlug: string | null
  depth: number
}) {
  const containsActive = useMemo(() => {
    function walk(n: NavTreeNode): boolean {
      if (n.posts.some((p) => p.slug === activeSlug)) return true
      return n.children.some(walk)
    }
    return walk(node)
  }, [node, activeSlug])

  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (containsActive) setOpen(true)
  }, [containsActive])

  return (
    <div className="nav-folder" style={{ ['--depth' as string]: depth }}>
      <button
        type="button"
        className="nav-folder-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`chevron${open ? ' open' : ''}`} aria-hidden>
          ▸
        </span>
        <span className="nav-folder-name">{node.folder.name}</span>
      </button>
      {open ? (
        <div className="nav-folder-body">
          {node.children.map((child) => (
            <FolderNodeView
              key={child.folder.id}
              node={child}
              activeSlug={activeSlug}
              depth={depth + 1}
            />
          ))}
          {node.posts.map((post) => (
            <PostLink key={post.id} post={post} active={post.slug === activeSlug} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SiteChrome({
  nav,
  adminUrl,
  categories,
  tags,
  folders,
  children,
}: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeSlug = pathname.startsWith('/posts/')
    ? decodeURIComponent(pathname.replace('/posts/', '').split('/')[0] || '')
    : null

  const activeCategory = searchParams.get('category')
  const homeActive = pathname === '/' && !activeCategory
  const recipesActive = pathname === '/' && activeCategory === 'recipe'
  const technicalActive = pathname === '/' && activeCategory === 'technical'

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-left">
          <Link className="brand" href="/">
            Certara Library
          </Link>
        </div>

        <SearchFilters
          categories={categories}
          tags={tags}
          folders={folders}
          posts={nav.allPosts}
        />

        <div className="site-header-right">
          <ThemeToggle />
          <a className="btn create" href={adminUrl}>
            Create
          </a>
        </div>
      </header>

      <div className="site-body">
        <aside className="site-sidebar" aria-label="Articles">
          <div className="sidebar-heading">Articles</div>
          {nav.tree.length === 0 && nav.unfiled.length === 0 ? (
            <p className="sidebar-empty">No published articles yet.</p>
          ) : (
            <>
              {nav.tree.map((node) => (
                <FolderNodeView
                  key={node.folder.id}
                  node={node}
                  activeSlug={activeSlug}
                  depth={0}
                />
              ))}
              {nav.unfiled.length > 0 ? (
                <div className="nav-folder unfiled">
                  <div className="nav-folder-name static">Unfiled</div>
                  <div className="nav-folder-body">
                    {nav.unfiled.map((post) => (
                      <PostLink
                        key={post.id}
                        post={post}
                        active={post.slug === activeSlug}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </aside>

        <main className="site-main">{children}</main>
      </div>
    </div>
  )
}
