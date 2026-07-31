# Task 38: Add dress and related caching

**Area:** performance
**Priority:** P1

## Objective

Implement **Add dress and related caching** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Keep React request memoization.
- Add persistent cache by slug for dress detail.
- Cache related dresses by dress and mode.
- Invalidate old and new slug tags after slug changes.

## Acceptance criteria

- [ ] Metadata and page rendering share cached data safely.
- [ ] Updated dresses appear promptly.
- [ ] Related results update after catalogue changes.
- [ ] 404 and hidden behavior is not incorrectly cached.

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
