# Task 3: Add slug history and redirects

**Area:** routing
**Priority:** P0

## Objective

Implement **Add slug history and redirects** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Prevent accidental slug changes after publication or require an explicit confirmation flow.
- Store previous slugs for each dress.
- Create permanent redirects from old slugs to the current slug.
- Preserve a valid `mode` query parameter through redirects.
- Add a custom storefront 404 page.

## Acceptance criteria

- [ ] An old slug returns a permanent redirect to the current dress URL.
- [ ] Hidden dresses remain unavailable.
- [ ] Sold dresses follow the agreed public visibility policy.
- [ ] Invalid redirect targets cannot create open redirects.

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
