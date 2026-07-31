# Task 1: Fix canonical metadata

**Area:** seo
**Priority:** P0

## Objective

Implement **Fix canonical metadata** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Remove `alternates.canonical: '/'` from the root frontend layout.
- Add self-canonical metadata for `/`, `/buy`, `/rent`, and `/book-a-fitting`.
- Add canonical `/dresses/[slug]` for dress detail pages, excluding `mode` and tracking query parameters.
- Prevent the site name from being appended twice in dress page titles.
- Add `noindex, nofollow` metadata to customer-specific pending/payment pages.

## Acceptance criteria

- [ ] `/buy` canonical resolves to `/buy`.
- [ ] `/rent` canonical resolves to `/rent`.
- [ ] `/dresses/example?mode=rent` canonical resolves to `/dresses/example`.
- [ ] No title contains `CAIT Bridal` twice.
- [ ] Pending and payment URLs expose both metadata and HTTP noindex protection.

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
