---
covers:
  - src/collections/Posts.ts
  - src/collections/Posts/**
  - src/blocks/RecipeEmbed.ts
  - src/app/(frontend)/**
  - src/components/ArticleRichText.tsx
---

# Posts collection

The `posts` collection stores documentation articles and recipes shown on the public site.

## Location

- Collection config: `src/collections/Posts.ts`
- Recipe embed block: `src/blocks/RecipeEmbed.ts`
- Registered in: `src/payload.config.ts`

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `title` | text | Required. Used as the admin title. |
| `slug` | text | Unique URL segment; auto-filled from title. Public URL: `/posts/{slug}`. |
| `summary` | textarea | Short blurb for listings and embed cards. |
| `folder` | relationship → folders | Nested sidebar placement. |
| `category` | relationship → categories | e.g. Technical or Recipe. |
| `tags` | relationship → tags (hasMany) | Subject grouping. |
| `sortOrder` | number | Order within a folder (lower first). |
| `content` | richText | Lexical body. Supports **Recipe / guide embed** and **Figma embed** blocks. |
| `includes` | relationship → posts (hasMany) | Related how-tos listed below the article. |
| `status` | select | `draft` (default) or `published`. |

## Section anchors

Headings in the rendered article get `id`s from their text (slugified). Link to a section with:

```text
/posts/changing-a-users-role#reset-password
```

Hover a heading on the frontend to reveal the `#` copy link.

## Composing recipes

1. Create a short post in the **Recipe** category (e.g. “How to log in”).
2. In a larger guide, either:
   - Insert a **Recipe / guide embed** block in the rich text (optional `sectionAnchor`), or
   - Add it under **Includes** so it appears in “Included how-tos”.

## Embedding Figma

1. In Figma: **Share** → set access to “Anyone with the link” → **Copy link**.
2. In the post editor, insert a **Figma embed** block and paste the URL.
3. Optional: add a title and adjust height (default 450px).

## Access

- Public `read` is allowed for published posts on the frontend; the collection currently allows public reads in the API as well.
- Writes require an authenticated admin or editor.

## Frontend

- List + filters: `src/app/(frontend)/page.tsx`
- Article: `src/app/(frontend)/posts/[slug]/page.tsx`
- Rich text + anchors/embeds: `src/components/ArticleRichText.tsx`
