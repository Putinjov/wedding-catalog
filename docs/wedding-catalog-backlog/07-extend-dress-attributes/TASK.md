# Task 7: Extend dress attributes

**Area:** cms
**Priority:** P1

## Objective

Implement **Extend dress attributes** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add neckline, sleeves, train, back, waistline, embellishments, fit notes, alteration possibilities, alteration limitations, included accessories, and optional accessories.
- Expose fields in the storefront where useful.
- Do not add customer-facing size filters or public size logic.

## Acceptance criteria

- [ ] Attributes are optional unless business rules require them.
- [ ] Public copy includes individual fitting and professional alteration messaging.
- [ ] Fields are usable in future filters and related ranking.

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
