# Task 37: Add catalogue caching and invalidation

**Area:** performance
**Priority:** P0

## Objective

Implement **Add catalogue caching and invalidation** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add persistent cache for catalogue queries.
- Normalize mode, filters, sort, and page into safe cache keys.
- Add tags for global dresses and mode catalogues.
- Invalidate from Payload hooks after relevant changes.

## Acceptance criteria

- [ ] Repeated catalogue requests avoid duplicate database work.
- [ ] Content updates appear after invalidation.
- [ ] Arbitrary query parameters cannot create unbounded cache keys.
- [ ] Preview and draft behavior remains correct.

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
