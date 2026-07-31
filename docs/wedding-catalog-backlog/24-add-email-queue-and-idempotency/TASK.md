# Task 24: Add email queue and idempotency

**Area:** notifications
**Priority:** P0

## Objective

Implement **Add email queue and idempotency** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Queue pending, confirmed, failed, expired, rescheduled, cancelled, refund, and admin-alert emails.
- Add retries and idempotency keys.
- Add resend action in admin.
- Use privacy-safe templates and logs.
- Keep email sending outside critical webhook transactions.

## Acceptance criteria

- [ ] Duplicate webhooks do not duplicate email.
- [ ] Transient failures retry.
- [ ] Permanent failures are visible.
- [ ] No phone, notes, or full email body is logged.

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
