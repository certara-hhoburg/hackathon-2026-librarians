# Admin overview

Payload's admin UI is served from the Next.js app under `/admin`.

## Starting admin

1. Copy `.env.example` to `.env` and set `PAYLOAD_SECRET`.
2. Run `npm run dev`.
3. Open [http://localhost:3000/admin](http://localhost:3000/admin).
4. Create the first user when prompted.

## Creating content

1. Open **Posts** in the sidebar.
2. Click **Create new**.
3. Set a title, optional content, and status.
4. Save. Published posts appear on the public homepage.

## Relevant code

- Admin routes: `src/app/(payload)/admin/**`
- Payload layout/API: `src/app/(payload)/**`
- Config: `src/payload.config.ts`

## Tips

- After changing admin-related UI components or field customizations, run `npm run generate:importmap`.
- After changing collections/fields, run `npm run generate:types`.
