# Task 35: Make ImageMedia server-compatible

**Area:** performance
**Priority:** P0

## Objective

Implement **Make ImageMedia server-compatible** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Remove `use client` from non-interactive ImageMedia.
- Keep interactive lightbox or carousel code in separate client components.
- Verify all usages remain compatible.

## Acceptance criteria

- [ ] Catalogue cards no longer hydrate an image wrapper.
- [ ] Build and type checks pass.
- [ ] No hydration warnings appear.
- [ ] Interactive galleries still function.

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
