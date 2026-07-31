# Task 39: Optimize Payload dress queries

**Area:** performance
**Priority:** P0

## Objective

Implement **Optimize Payload dress queries** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Use `select` for catalogue and related queries.
- Reduce relationship depth where possible.
- Fetch only fields needed by cards.
- Add pagination and inspect query plans.
- Add indexes only for actual public query patterns.

## Acceptance criteria

- [ ] RSC payload and database response size decrease.
- [ ] Card rendering retains all required data.
- [ ] Query performance is measured before and after.
- [ ] No unnecessary fields or nested media records are fetched.

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
