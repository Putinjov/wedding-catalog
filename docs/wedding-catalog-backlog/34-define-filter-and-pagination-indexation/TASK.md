# Task 34: Define filter and pagination indexation

**Area:** seo
**Priority:** P1

## Objective

Implement **Define filter and pagination indexation** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Set filtered catalogue URLs to `noindex, follow` with canonical to the base catalogue.
- Use self-canonical pagination.
- Keep search pages noindex.
- Allow dedicated editorial designer and silhouette landing pages to be indexable when they contain unique content.

## Acceptance criteria

- [ ] Query combinations do not create index bloat.
- [ ] Page 2 and deeper remain crawlable.
- [ ] Canonical tags match the documented policy.
- [ ] Metadata tests cover filter and pagination cases.

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
