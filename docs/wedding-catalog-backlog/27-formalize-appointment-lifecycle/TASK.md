# Task 27: Formalize appointment lifecycle

**Area:** domain
**Priority:** P0

## Objective

Implement **Formalize appointment lifecycle** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Define appointment states: pending_payment, payment_processing, confirmed, expired, cancelled, completed, no_show, payment_failed, payment_received_conflict, refunded, and partially_refunded.
- Define separate payment states: unpaid, processing, paid, failed, refunded, and partially_refunded.
- Create transition guards and migration rules.

## Acceptance criteria

- [ ] Appointment and payment state are never conflated.
- [ ] Every transition is tested.
- [ ] Admin and webhook paths share transition logic.
- [ ] Legacy records migrate safely.

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
