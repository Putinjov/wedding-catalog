# Task 22: Clean up expired holds

**Area:** payments
**Priority:** P0

## Objective

Implement **Clean up expired holds** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Create an authenticated cron job for expired pending appointments.
- Release slot locks and mark appointments expired.
- Skip paid and actively processing appointments.
- Process bounded batches with idempotency.
- Add structured logs and failure alerts.

## Acceptance criteria

- [ ] Rerunning the job is safe.
- [ ] No paid appointment is expired.
- [ ] Released slots become bookable.
- [ ] Failures are visible to operations.

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
