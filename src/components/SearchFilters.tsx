'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { fuzzyRank } from '@/lib/fuzzy'
import type { NavPost } from '@/lib/nav'

export type FilterOption = {
  slug: string
  name: string
}

type FilterSelectProps = {
  label: string
  param: 'category' | 'tag' | 'folder'
  options: FilterOption[]
  value: string | null
}

function FilterSelect({ label, param, options, value }: FilterSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.slug === value) || null

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    )
  }, [filterText, options])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const apply = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) params.set(param, slug)
      else params.delete(param)
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/')
      setOpen(false)
      setFilterText('')
    },
    [param, router, searchParams],
  )

  if (options.length === 0) return null

  return (
    <div className={`filter-select${open ? ' open' : ''}${selected ? ' has-value' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="filter-select-label">{label}</span>
        <span className="filter-select-value">{selected ? selected.name : 'Any'}</span>
        <span className="filter-select-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="filter-select-panel" role="listbox" id={listId}>
          {options.length > 8 ? (
            <input
              className="filter-select-search"
              type="search"
              placeholder={`Filter ${label.toLowerCase()}…`}
              value={filterText}
              autoFocus
              onChange={(e) => setFilterText(e.target.value)}
            />
          ) : null}
          <button
            type="button"
            className={`filter-select-option${!selected ? ' active' : ''}`}
            role="option"
            aria-selected={!selected}
            onClick={() => apply(null)}
          >
            Any {label.toLowerCase()}
          </button>
          <div className="filter-select-list">
            {filtered.length === 0 ? (
              <p className="filter-select-empty">No matches</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.slug}
                  type="button"
                  className={`filter-select-option${value === option.slug ? ' active' : ''}`}
                  role="option"
                  aria-selected={value === option.slug}
                  onClick={() => apply(option.slug)}
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

type SearchFiltersProps = {
  categories: FilterOption[]
  tags: FilterOption[]
  folders: FilterOption[]
  posts: NavPost[]
}

export function SearchFilters({ categories, tags, folders, posts }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get('category')
  const tag = searchParams.get('tag')
  const folder = searchParams.get('folder')

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const results = useMemo(
    () =>
      fuzzyRank(
        query,
        posts,
        (p) => [p.title, p.summary, p.categoryName],
        8,
      ),
    [posts, query],
  )

  const showDropdown = open && query.trim().length > 0

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!showDropdown) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [showDropdown])

  const goTo = useCallback(
    (slug: string) => {
      setOpen(false)
      setQuery('')
      router.push(`/posts/${slug}`)
    },
    [router],
  )

  return (
    <div className="header-search-cluster">
      <div className="header-filters" aria-label="Filters">
        <FilterSelect label="Category" param="category" options={categories} value={category} />
        <FilterSelect label="Tag" param="tag" options={tags} value={tag} />
        <FilterSelect label="Folder" param="folder" options={folders} value={folder} />
      </div>
      <div className="header-search" ref={rootRef}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (results[activeIndex]) goTo(results[activeIndex].slug)
          }}
        >
          <label className="sr-only" htmlFor="site-search">
            Search articles
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search articles…"
            value={query}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onKeyDown={(e) => {
              if (!showDropdown) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
          />
        </form>
        {showDropdown ? (
          <div className="search-suggest" role="listbox" id={listId}>
            {results.length === 0 ? (
              <p className="search-suggest-empty">No matching articles</p>
            ) : (
              results.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className={`search-suggest-item${index === activeIndex ? ' active' : ''}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="search-suggest-title">{post.title}</span>
                  {post.categoryName || post.summary ? (
                    <span className="search-suggest-meta">
                      {post.categoryName ? <span>{post.categoryName}</span> : null}
                      {post.summary ? <span>{post.summary}</span> : null}
                    </span>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
