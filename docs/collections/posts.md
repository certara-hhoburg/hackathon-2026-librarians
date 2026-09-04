# Posts collection

The `posts` collection stores editorial content shown on the public homepage.

## Location

- Collection config: `src/collections/Posts.ts`
- Registered in: `src/payload.config.ts`

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `title` | text | Required. Used as the admin title. |
| `content` | richText | Lexical rich text body. |
| `status` | select | `draft` (default) or `published`. |

> **Demo note:** This table is meant to go stale. If you add a field in `Posts.ts` (for example `summary`), this doc should be updated—and the docs-update Action should catch that.

## Access

- Public `read` is allowed for all posts (including drafts) in this PoC.
- Writes require an authenticated admin user.

## Frontend usage

The homepage (`src/app/(frontend)/page.tsx`) loads published posts:

```ts
await payload.find({
  collection: 'posts',
  where: { status: { equals: 'published' } },
  limit: 10,
  sort: '-updatedAt',
})
```

## REST API

- List: `GET /api/posts`
- Create (auth): `POST /api/posts`
