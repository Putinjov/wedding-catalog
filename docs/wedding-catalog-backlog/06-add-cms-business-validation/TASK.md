# Task 6: Add CMS business validation

**Area:** cms
**Priority:** P0

## Objective

Implement **Add CMS business validation** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Require a sale price or explicit price-on-request state when a dress is for sale.
- Require rental price when rental is enabled.
- Validate security deposit according to business policy.
- Require `previousSalePrice > salePrice`.
- Require or auto-generate gallery alt text.
- Reject invalid status combinations and duplicate slugs.

## Acceptance criteria

- [ ] Invalid records cannot be published.
- [ ] Validation errors are clear to admin users.
- [ ] Existing valid content survives migration.
- [ ] Generated types and integration tests pass.

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
