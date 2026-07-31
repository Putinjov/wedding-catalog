# Task 4: Split sale and rental availability

**Area:** data-model
**Priority:** P0

## Objective

Implement **Split sale and rental availability** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Replace the single availability state with separate `saleStatus`, `rentalStatus`, and `publicVisibility` fields.
- Define migration rules for existing records.
- Update generated Payload types.
- Update admin labels and help text.

## Acceptance criteria

- [ ] Sold dresses can remain public while disappearing from the Buy catalogue.
- [ ] A rented dress may remain available for sale.
- [ ] Cleaning and repair states block rental availability.
- [ ] Hidden and archived dresses are excluded from all public surfaces.

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
