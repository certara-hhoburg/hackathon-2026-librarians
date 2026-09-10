---
covers:
  - package.json
  - .env.example
  - next.config.ts
  - next.config.js
  - next.config.mjs
  - netlify.toml
  - src/payload.config.ts
---

# Local setup

## Requirements

- Node.js 20.9+ (22 LTS recommended)
- npm
- A PostgreSQL database (Supabase recommended)

## Install

```bash
cp .env.example .env
npm install
npm run dev
```

Fill in `DATABASE_URI` and `PAYLOAD_SECRET` before starting. Payload creates the schema on first connection.

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | Postgres URI from Supabase (use the pooler for Netlify) |
| `PAYLOAD_SECRET` | Payload encryption/signing secret |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` | Supabase Storage S3 API (required for media on Netlify) |
| `GEMINI_API_KEY` | Required for header Ask mode (https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.6-flash` |
| `OPENAI_API_KEY` | Optional. Enables the docs triage agent + `--apply` generation |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js + Payload locally |
| `npm run build` / `npm start` | Production build and serve |
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate admin import map |
| `npm run docs:update` | Triage docs from git diffs (agent if key set) |
| `npm run docs:update -- --apply` | Also generate suggested markdown updates |

## Docs-update check

To exercise the docs Action:

1. Change a covered source file (for example `src/collections/Posts.ts`).
2. Open a PR (or run `npm run docs:update -- --base HEAD`).
3. Expect a selection for the matching page under `docs/` and a PR comment when the workflow runs.
