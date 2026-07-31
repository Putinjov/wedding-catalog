# Task 43: Verify and harden production cron jobs

**Area:** operations
**Priority:** P0

## Objective

Implement **Verify and harden production cron jobs** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Confirm deployment schedule, endpoint, secret validation, timeout, retries, and alerts.
- Make every job idempotent and bounded.
- Support manual rerun.
- Cover expired holds, stale locks, stale webhook claims, reminders, and retention jobs as applicable.

## Acceptance criteria

- [ ] A configured secret alone is not treated as proof the cron runs.
- [ ] Each job records success and failure metrics.
- [ ] Retries do not duplicate side effects.
- [ ] Manual execution is documented.

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
