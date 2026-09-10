# Certara Library

Documentation library built with [Payload CMS](https://payloadcms.com) and Next.js. Browse published articles on the public site; author content in the Payload admin.

## Features

- Nested folder navigation, categories, and tags
- Full-text search with fuzzy autocomplete
- Recipe / guide embeds and Figma embeds in rich text
- Admin and editor roles
- Optional PR docs-update workflow (triage agent + suggested markdown)

## Stack

- Payload 3 + Next.js 15
- PostgreSQL (Supabase recommended)
- S3-compatible media storage (Supabase Storage) for production / Netlify

## Quick start

1. Create a Supabase project and copy the Postgres connection string (**Project Settings → Database → URI**). Prefer the connection pooler URI for serverless hosts.
2. Copy env defaults and fill in secrets:

```bash
cp .env.example .env
```

3. Install and run:

```bash
npm install
npm run dev
```

- Site: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

On first boot, Payload creates the schema. Create the first user in admin (that account becomes an admin).

### Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | Postgres connection string (Supabase) |
| `PAYLOAD_SECRET` | Encryption / signing secret (`openssl rand -hex 32`) |
| `S3_*` | Supabase Storage S3 credentials (required on Netlify for uploads) |
| `GEMINI_API_KEY` | Required for header **Ask** mode (free from Google AI Studio) |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.6-flash` |
| `OPENAI_API_KEY` | Optional. Enables the docs triage agent in CLI / GitHub Actions |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini` |

## Deploy to Netlify

1. Push this repo to GitHub and create a Netlify site from the repository.
2. Set environment variables in Netlify to match `.env.example` (`DATABASE_URI`, `PAYLOAD_SECRET`, and the `S3_*` values).
3. Use the **connection pooler** URI from Supabase (port `6543`, often with `?pgbouncer=true`) for serverless functions.
4. Deploy. Open `/admin` on the Netlify URL to create the first user.

`netlify.toml` builds with the Next.js plugin. Media must use S3-compatible storage on Netlify (local disk is not persistent).

### Supabase Storage (S3)

1. Create a public bucket named `media` (or match `S3_BUCKET`).
2. Project Settings → Storage → **S3 access keys** → create credentials.
3. Set `S3_ENDPOINT` to `https://<project-ref>.storage.supabase.co/storage/v1/s3` (use the endpoint shown in Storage → Configuration → S3).

## Docs update workflow

```bash
npm run docs:update -- --base HEAD --heuristic-only

export OPENAI_API_KEY=sk-...
npm run docs:update -- --base HEAD

npm run docs:update -- --base HEAD --apply
```

GitHub Actions: [`.github/workflows/docs-update.yml`](./.github/workflows/docs-update.yml). Add repository secret `OPENAI_API_KEY` to enable the agent on PRs.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Local Payload + Next.js |
| `npm run build` / `npm start` | Production build and serve |
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate admin import map |
| `npm run docs:update` | Triage docs from git diffs |

## Documentation

See [docs/README.md](./docs/README.md).
