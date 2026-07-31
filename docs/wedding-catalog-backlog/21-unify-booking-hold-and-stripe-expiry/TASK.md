# Task 21: Unify booking hold and Stripe expiry

**Area:** payments
**Priority:** P0

## Objective

Implement **Unify booking hold and Stripe expiry** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Use one shared hold duration.
- Set Stripe Checkout expiry to match the appointment slot hold.
- Add a countdown to pending/payment UI.
- Prevent expired sessions from silently confirming an invalid slot.
- Define conflict behavior for late payment events.

## Acceptance criteria

- [ ] Displayed countdown matches server expiry.
- [ ] Expired slots become available again.
- [ ] Stripe and appointment states cannot drift silently.
- [ ] Tests cover expiry boundaries.

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
