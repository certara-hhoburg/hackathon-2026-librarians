---
covers:
  - src/collections/Folders.ts
  - src/app/(frontend)/layout.tsx
  - src/components/SiteChrome.tsx
  - src/lib/nav.ts
---

# Folders and site navigation

## Folders

Nested folders organize articles in the public left sidebar.

- Collection: `src/collections/Folders.ts`
- Fields: `name`, `slug`, `parent` (self-relationship), `sortOrder`
- Posts: optional `folder` + `sortOrder` sidebar fields

### Nesting

1. Create a top-level folder (no parent), e.g. **Getting started**.
2. Create a child with **Parent** set to that folder, e.g. **Auth**.
3. Assign posts to a folder from the post sidebar.

Unfiled published posts appear under **Unfiled** in the sidebar.

## Public chrome

- Header: Home, Recipes/Technical shortcuts, search, **Create** → `/admin`
- Left nav: folder tree + articles (`src/components/SiteChrome.tsx`)
- Search filters the sidebar (and homepage list via `?q=`)
