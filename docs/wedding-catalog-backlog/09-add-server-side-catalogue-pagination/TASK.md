# Task 9: Add server-side catalogue pagination

**Area:** catalogue
**Priority:** P0

## Objective

Implement **Add server-side catalogue pagination** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Read page from URL query parameters.
- Use Payload pagination rather than a hardcoded first 24 records.
- Show result count and previous/next controls.
- Handle invalid or out-of-range pages.
- Preserve filter, sort, and scroll state.

## Acceptance criteria

- [ ] Every published matching dress is reachable.
- [ ] Pagination works without client-only filtering.
- [ ] Page state is shareable via URL.
- [ ] Navigation is keyboard accessible.

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
