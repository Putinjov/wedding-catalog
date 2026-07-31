# Task 11: Add catalogue filters

**Area:** catalogue
**Priority:** P1

## Objective

Implement **Add catalogue filters** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add silhouette, designer, category, fabric, colour, price, and featured filters.
- Later support neckline, sleeves, train, and embellishments.
- Implement desktop filter UI and a mobile drawer.
- Add active filter chips, clear-all, and result count.
- Do not add size filters.

## Acceptance criteria

- [ ] Filters are server-backed and URL-driven.
- [ ] Multiple filters combine correctly.
- [ ] Empty states are customer-facing.
- [ ] Filtered pages follow the SEO noindex policy.

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
