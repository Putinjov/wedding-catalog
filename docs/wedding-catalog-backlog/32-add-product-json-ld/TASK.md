# Task 32: Add Product JSON-LD

**Area:** seo
**Priority:** P0

## Objective

Implement **Add Product JSON-LD** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add Product schema to dress pages.
- Include name, description, images, brand, SKU, canonical URL, and sale Offer when valid.
- Map availability accurately.
- Do not invent reviews or ratings.
- Do not represent a rental fee as a sale offer.

## Acceptance criteria

- [ ] Structured data validates.
- [ ] Sale prices and availability match visible content.
- [ ] Sold items use OutOfStock where appropriate.
- [ ] Rental-only dresses do not expose misleading sale offers.

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
