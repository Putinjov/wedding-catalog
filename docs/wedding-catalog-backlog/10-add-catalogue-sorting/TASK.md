# Task 10: Add catalogue sorting

**Area:** catalogue
**Priority:** P1

## Objective

Implement **Add catalogue sorting** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Support Featured, Curated order, Newest, Price low-to-high, and Price high-to-low.
- Add `featured` and `displayOrder` CMS fields.
- Use separate sale and rental prices depending on mode.
- Normalize invalid sort values.

## Acceptance criteria

- [ ] Sort state is represented in the URL.
- [ ] Sorting is deterministic with a stable secondary sort.
- [ ] Buy uses sale price and Rent uses rental price.
- [ ] Invalid sort values fall back safely.

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
