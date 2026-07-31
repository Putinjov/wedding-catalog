# Task 26: Expand appointment admin drawer

**Area:** admin
**Priority:** P1

## Objective

Implement **Expand appointment admin drawer** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add contact actions, reschedule, cancel, refund, resend confirmation, notes, status history, payment history, conflict resolution, and audit trail.
- Support undecided intent.
- Restrict actions by current state and permission.

## Acceptance criteria

- [ ] Invalid transitions are blocked.
- [ ] All mutations are auditable.
- [ ] Refund and reschedule actions are idempotent.
- [ ] Sensitive provider secrets are never shown.

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
