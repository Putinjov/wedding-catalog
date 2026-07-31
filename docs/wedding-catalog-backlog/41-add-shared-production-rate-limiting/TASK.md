# Task 41: Add shared production rate limiting

**Area:** operations
**Priority:** P0

## Objective

Implement **Add shared production rate limiting** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Replace process-local limiting with Redis, KV, Cloudflare, or equivalent shared enforcement.
- Use separate policies for availability, appointment creation, and payment-related endpoints.
- Handle trusted proxy/IP extraction safely.
- Add email/phone abuse controls where appropriate.

## Acceptance criteria

- [ ] Limits remain consistent across serverless instances.
- [ ] Legitimate booking flows are not blocked.
- [ ] Abuse events are observable.
- [ ] Sensitive values are never logged.

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
