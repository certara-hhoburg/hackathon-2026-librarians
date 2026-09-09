---
covers:
  - src/app/(payload)/**
  - src/payload.config.ts
  - src/collections/Users.ts
  - src/collections/Media.ts
---

# Admin overview

Payload's admin UI is served from the Next.js app under `/admin`.

## Starting admin

1. Copy `.env.example` to `.env` and set `DATABASE_URI` and `PAYLOAD_SECRET`.
2. Run `npm run dev`.
3. Open [http://localhost:3000/admin](http://localhost:3000/admin).
4. Create the first user when prompted.

## Creating content

1. Sign in as an **Admin** (the first user created is always admin).
2. Create **Folders** for the sidebar tree (set **Parent** to nest folders). Editors can do this too.
3. As admin, create **Categories** (e.g. `Technical`, `Recipe`) and **Tags**.
4. Optionally create an **Editor** user (Users → Create → role Editor) for authors who should only manage posts/folders.
5. Open **Posts** → **Create new** (or use the public **Create** button → admin).
6. Set title (slug auto-fills), folder, category, tags, and status.
7. Use headings in the body so section links work (`/posts/{slug}#heading-id`).
8. For a larger guide, insert a **Recipe / guide embed** block and/or pick **Includes**.
9. Publish. Browse via the left nav, header search, or homepage filters.

## Relevant code

- Admin routes: `src/app/(payload)/admin/**`
- Payload layout/API: `src/app/(payload)/**`
- Config: `src/payload.config.ts`

## Tips

- After changing admin-related UI components or field customizations, run `npm run generate:importmap`.
- After changing collections/fields, run `npm run generate:types`.
