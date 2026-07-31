# Task 15: Add breadcrumbs and return navigation

**Area:** navigation
**Priority:** P0

## Objective

Implement **Add breadcrumbs and return navigation** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add visual breadcrumbs to dress pages.
- Add BreadcrumbList JSON-LD.
- Make breadcrumbs mode-aware for Buy and Rent.
- Add Back to catalogue with filter/page restoration.
- Validate any `returnTo` parameter.

## Acceptance criteria

- [ ] Breadcrumbs are visible and keyboard accessible.
- [ ] Structured data uses canonical URLs.
- [ ] Back navigation restores catalogue context.
- [ ] No open redirect is possible.

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
