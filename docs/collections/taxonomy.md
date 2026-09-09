---
covers:
  - src/collections/Tags.ts
  - src/collections/Categories.ts
  - src/app/(frontend)/tags/**
  - src/app/(frontend)/categories/**
---

# Tags and categories

## Categories

High-level buckets for documentation. Typical values:

| Name | Slug | Purpose |
|------|------|---------|
| Technical | `technical` | Reference / conceptual docs |
| Recipe | `recipe` | Short how-to guides meant to be reused |

- Collection: `src/collections/Categories.ts`
- Public index: `/categories/{slug}`

Create these in **Admin → Categories** on first run.

## Tags

Subject labels that can span categories (e.g. `auth`, `roles`, `validation`).

- Collection: `src/collections/Tags.ts`
- Public index: `/tags/{slug}`
- Homepage filters: `/?tag={slug}` and `/?category={slug}`

## On posts

Posts relate to one category and many tags (sidebar fields in the Posts admin).
