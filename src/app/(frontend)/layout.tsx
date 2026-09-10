import { getPayload } from 'payload'
import React, { Suspense } from 'react'

import { SiteChrome } from '@/components/SiteChrome'
import { themeInitScript } from '@/components/ThemeToggle'
import { buildNavTree, toNavFolder, toNavPost } from '@/lib/nav'
import config from '@/payload.config'
import './styles.css'

export const metadata = {
  description: 'Certara Library — documentation, recipes, and reference guides',
  title: 'Certara Library',
}

// CMS-backed pages — always render on request (avoids stale static builds / schema race on deploy).
export const dynamic = 'force-dynamic'

async function loadChromeData() {
  const payload = await getPayload({ config: await config })
  const [{ docs: folders }, { docs: posts }, { docs: categories }, { docs: tags }] =
    await Promise.all([
      payload.find({ collection: 'folders', limit: 500, depth: 1, sort: 'sortOrder' }),
      payload.find({
        collection: 'posts',
        where: { status: { equals: 'published' } },
        limit: 500,
        depth: 1,
        sort: 'sortOrder',
      }),
      payload.find({ collection: 'categories', limit: 500, sort: 'name' }),
      payload.find({ collection: 'tags', limit: 500, sort: 'name' }),
    ])

  return {
    nav: buildNavTree(folders.map(toNavFolder), posts.map(toNavPost)),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    tags: tags.map((t) => ({ slug: t.slug, name: t.name })),
    folders: folders.map((f) => ({ slug: f.slug, name: f.name })),
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const payloadConfig = await config
  const { nav, categories, tags, folders } = await loadChromeData()
  const adminUrl = payloadConfig.routes?.admin || '/admin'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={<div className="site-loading">Loading…</div>}>
          <SiteChrome
            adminUrl={adminUrl}
            nav={nav}
            categories={categories}
            tags={tags}
            folders={folders}
          >
            {props.children}
          </SiteChrome>
        </Suspense>
      </body>
    </html>
  )
}
