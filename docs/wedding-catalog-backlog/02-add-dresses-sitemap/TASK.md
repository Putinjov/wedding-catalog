# Task 2: Add dresses sitemap

**Area:** seo
**Priority:** P0

## Objective

Implement **Add dresses sitemap** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Create `/dresses-sitemap.xml`.
- Add the dresses sitemap to `/sitemap.xml`.
- Add real static routes such as `/buy`, `/rent`, and `/book-a-fitting` to the appropriate sitemap.
- Remove `/search` from the sitemap unless an explicit indexation policy says otherwise.
- Add cache tags and Payload revalidation hooks for sitemap updates.

## Acceptance criteria

- [ ] Only published and publicly visible dresses are listed.
- [ ] Draft, hidden, and invalid-slug dresses are excluded.
- [ ] `lastmod` uses `updatedAt`.
- [ ] All listed URLs return HTTP 200.
- [ ] Publish, unpublish, and visibility changes invalidate the sitemap cache.

## Required implementation discipline

- Inspect the current implementation before editing.
- Reuse existing domain utilities instead of duplicating logic.
- Add or update unit/integration tests.
- Update generated Payload types and import maps when schema changes.
- Include migration and rollback notes when data shape changes.
- Keep customer PII out of logs and provider metadata.
- Run the repository validation commands before completion.

## Validation commands

```bash
npm ci
npm run generate:types
npm run generate:importmap
npm run lint
npm run test:int
npm run build
```

## Completion report

Report:
- files changed;
- tests added or updated;
- migrations created;
- manual verification performed;
- remaining risks or follow-up work.
