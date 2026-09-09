---
covers:
  - src/collections/Users.ts
  - src/access/roles.ts
---

# Roles and access

Users have a **role** that controls what they can manage in the admin panel.

| Role | Can do |
|------|--------|
| **Admin** | Users, categories, tags, media, posts, folders |
| **Editor** | Posts, folders, media (upload). Can edit own profile. Cannot create users or taxonomy. |

## Behavior

- The **first user** created after a DB reset is automatically an **admin**.
- Only admins can change someone’s role.
- Categories / Tags collections are hidden from the editor sidebar.
- Editors can still **assign** existing categories and tags on posts (read access).
- Editors may still *see* Categories/Tags in the admin nav, but create/update/delete are blocked by access control.

## Verify roles

1. Sign in as admin → Users → Create an editor account (`role: Editor`).
2. Sign in as that editor — you should see Posts and Folders; user and taxonomy management stay admin-only.
3. As admin, create categories/tags the editor can assign when authoring.
