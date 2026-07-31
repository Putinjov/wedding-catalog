# Task 23: Implement paid conflict workflow

**Area:** payments
**Priority:** P0

## Objective

Implement **Implement paid conflict workflow** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add `payment_received_conflict` state.
- Detect successful payment when confirmation cannot safely complete.
- Create admin actions to contact, reschedule, refund, and resolve.
- Send an internal alert.
- Keep an audit trail.

## Acceptance criteria

- [ ] No successful payment is left in an ambiguous silent state.
- [ ] Admin can resolve every conflict.
- [ ] Customer communications avoid exposing internal errors.
- [ ] Resolution is idempotent.

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
