import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: {
      status: {
        equals: 'published',
      },
    },
    limit: 10,
    sort: '-updatedAt',
  })

  return (
    <div className="home">
      <div className="content">
        <p className="eyebrow">Payload Docs Update PoC</p>
        {!user || !('email' in user) ? (
          <h1>Published posts</h1>
        ) : (
          <h1>Welcome back, {user.email}</h1>
        )}
        <p className="lede">
          A minimal Payload + Next.js app used to demo AI-assisted documentation updates on
          code changes.
        </p>
        <div className="links">
          <a className="admin" href={payloadConfig.routes.admin}>
            Admin panel
          </a>
          <a className="docs" href="/docs">
            Project docs
          </a>
        </div>

        <ul className="posts">
          {posts.length === 0 ? (
            <li className="empty">No published posts yet. Create one in the admin panel.</li>
          ) : (
            posts.map((post) => (
              <li key={post.id}>
                <strong>{post.title}</strong>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
