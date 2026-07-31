# Task 44: Add and verify database indexes

**Area:** database
**Priority:** P0

## Objective

Implement **Add and verify database indexes** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add indexes for dress slug, visibility/status fields, appointment slot key, appointment date/status, hold expiry, Stripe identifiers, webhook event ID, and cleanup timestamps.
- Add filter indexes only after confirming query patterns.
- Document index creation and rollback.

## Acceptance criteria

- [ ] Unique constraints protect slot and webhook idempotency.
- [ ] Production startup verifies required indexes.
- [ ] Queries avoid full scans on critical paths.
- [ ] Index changes are migration-safe.

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
