'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { ASK_MAX_QUERY_CHARS } from '@/lib/ask-constants'
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

type AskSource = {
  title: string
  slug: string
  summary?: string | null
  categoryName?: string | null
}

type AskResult = {
  answer: string
  sources: AskSource[]
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

  const [mode, setMode] = useState<'search' | 'ask'>('search')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askResult, setAskResult] = useState<AskResult | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const askAbortRef = useRef<AbortController | null>(null)

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

  const showSearchDropdown = mode === 'search' && open && query.trim().length > 0
  const showAskPanel = mode === 'ask' && open && (askLoading || askError || askResult)

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    return () => askAbortRef.current?.abort()
  }, [])

  const goTo = useCallback(
    (slug: string) => {
      setOpen(false)
      setQuery('')
      setAskResult(null)
      setAskError(null)
      router.push(`/posts/${slug}`)
    },
    [router],
  )

  const runAsk = useCallback(async () => {
    const question = query.trim()
    if (!question || askLoading) return

    askAbortRef.current?.abort()
    const controller = new AbortController()
    askAbortRef.current = controller

    setAskLoading(true)
    setAskError(null)
    setAskResult(null)
    setOpen(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })
      const data = (await res.json()) as { answer?: string; sources?: AskSource[]; error?: string }
      if (!res.ok) {
        setAskError(data.error || 'Something went wrong.')
        return
      }
      setAskResult({
        answer: data.answer || 'No answer was generated.',
        sources: data.sources || [],
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setAskError('Could not reach the ask service.')
    } finally {
      setAskLoading(false)
    }
  }, [askLoading, query])

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
            if (mode === 'ask') {
              void runAsk()
              return
            }
            if (results[activeIndex]) goTo(results[activeIndex].slug)
          }}
        >
          <div className="search-mode-toggle" role="group" aria-label="Search mode">
            <button
              type="button"
              className={mode === 'search' ? 'active' : ''}
              onClick={() => {
                setMode('search')
                setAskResult(null)
                setAskError(null)
              }}
            >
              Search
            </button>
            <button
              type="button"
              className={mode === 'ask' ? 'active' : ''}
              onClick={() => {
                setMode('ask')
                setOpen(Boolean(askResult || askError))
              }}
            >
              Ask
            </button>
          </div>
          <label className="sr-only" htmlFor="site-search">
            {mode === 'ask' ? 'Ask a question' : 'Search articles'}
          </label>
          <input
            id="site-search"
            type="search"
            placeholder={mode === 'ask' ? 'Ask a question… e.g. What is CDISC?' : 'Search articles…'}
            value={query}
            maxLength={ASK_MAX_QUERY_CHARS}
            autoComplete="off"
            aria-autocomplete={mode === 'search' ? 'list' : undefined}
            aria-controls={mode === 'search' ? listId : undefined}
            aria-expanded={mode === 'search' ? showSearchDropdown : undefined}
            onFocus={() => {
              if (mode === 'search' || askResult || askError || askLoading) setOpen(true)
            }}
            onChange={(e) => {
              setQuery(e.target.value.slice(0, ASK_MAX_QUERY_CHARS))
              if (mode === 'search') setOpen(true)
              if (mode === 'ask') {
                setAskResult(null)
                setAskError(null)
              }
            }}
            onKeyDown={(e) => {
              if (mode !== 'search' || !showSearchDropdown) {
                if (e.key === 'Escape') setOpen(false)
                return
              }
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
          {mode === 'ask' ? (
            <button type="submit" className="ask-submit" disabled={askLoading || !query.trim()}>
              {askLoading ? '…' : 'Ask'}
            </button>
          ) : null}
        </form>

        {showSearchDropdown ? (
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

        {showAskPanel ? (
          <div className="ask-panel" role="region" aria-live="polite" aria-label="Ask answer">
            {askLoading ? <p className="ask-status">Looking through the library…</p> : null}
            {askError ? <p className="ask-error">{askError}</p> : null}
            {askResult ? (
              <>
                <p className="ask-answer">{askResult.answer}</p>
                {askResult.sources.length > 0 ? (
                  <div className="ask-sources">
                    <p className="ask-sources-label">Related articles</p>
                    <ul>
                      {askResult.sources.map((source) => (
                        <li key={source.slug}>
                          <Link
                            href={`/posts/${source.slug}`}
                            onClick={() => {
                              setOpen(false)
                              setQuery('')
                              setAskResult(null)
                            }}
                          >
                            {source.title}
                          </Link>
                          {source.summary ? <span>{source.summary}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
