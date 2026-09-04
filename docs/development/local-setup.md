# Local setup

## Requirements

- Node.js 20.9+ (22 LTS recommended)
- npm

## Install

```bash
cp .env.example .env
npm install
npm run dev
```

SQLite creates `payload.db` on first boot. No Docker required.

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | SQLite file URL, e.g. `file:./payload.db` |
| `PAYLOAD_SECRET` | Payload encryption/signing secret |
| `OPENAI_API_KEY` | Optional. Enables AI doc generation (`docs:update --apply`) |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js + Payload locally |
| `npm run build` / `npm start` | Production build and serve |
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate admin import map |
| `npm run docs:update` | Build a docs-update prompt from git diffs |
| `npm run docs:update -- --apply` | Same, then call OpenAI if `OPENAI_API_KEY` is set |

## Demo change

To exercise the docs Action:

1. Add a field to `src/collections/Posts.ts` (for example `summary`).
2. Open a PR (or run `npm run docs:update -- --base origin/main`).
3. Expect `docs/collections/posts.md` to be mapped and a prompt (or AI suggestion) to appear.
