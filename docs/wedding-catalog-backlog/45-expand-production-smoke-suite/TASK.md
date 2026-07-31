# Task 45: Expand production smoke suite

**Area:** testing
**Priority:** P0

## Objective

Implement **Expand production smoke suite** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Test `/buy`, `/rent`, dress detail, booking, Stripe replay, sitemap index, dresses sitemap, canonical metadata, JSON-LD, noindex headers, email, cron, and rollback.
- Update deployment documentation.
- Add Lighthouse or performance budget checks where stable.

## Acceptance criteria

- [ ] Clean checkout passes generate, lint, integration tests, and build.
- [ ] Critical production routes return expected status and headers.
- [ ] Stripe replay remains idempotent.
- [ ] Deployment checklist matches the final architecture.

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
