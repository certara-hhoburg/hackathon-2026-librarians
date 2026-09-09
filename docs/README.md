---
covers: []
---

# Project documentation

Handbooks for this library. On each PR, a GitHub Action can run a **triage agent** that:

1. Reads the git diff
2. Loads this `docs/` inventory (titles, headings, optional `covers:` globs)
3. Selects which pages likely need updates
4. Posts a PR comment (and optionally generates markdown suggestions)

## Contents

| Doc | Covers |
|-----|--------|
| [Collections: Posts](./collections/posts.md) | Posts fields, anchors, recipe embeds |
| [Folders & navigation](./collections/folders.md) | Nested sidebar folders and site chrome |
| [Tags & categories](./collections/taxonomy.md) | Categories, tags, and filters |
| [Roles & access](./collections/roles.md) | Admin vs editor permissions |
| [Admin overview](./admin/overview.md) | Running the admin panel and creating content |
| [Local setup](./development/local-setup.md) | Clone, env, and npm scripts |

Optional YAML frontmatter on each page:

```yaml
---
covers:
  - src/collections/Posts.ts
  - src/app/(frontend)/**
---
```

`covers` hints the triage agent and offline scoring; it is not a full registry of every source file.
