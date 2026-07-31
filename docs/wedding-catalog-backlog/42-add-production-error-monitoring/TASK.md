# Task 42: Add production error monitoring

**Area:** operations
**Priority:** P0

## Objective

Implement **Add production error monitoring** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Integrate a centralized error-monitoring provider.
- Capture server, frontend booking, webhook, email, cron, R2, and database failures.
- Add PII redaction.
- Use correlation identifiers such as request ID, appointment reference, Stripe event ID, and job ID.

## Acceptance criteria

- [ ] Critical failures generate alerts.
- [ ] Logs contain no phone, notes, or full customer content.
- [ ] Webhook and cron failures can be traced end-to-end.
- [ ] Source maps work for production builds.

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
