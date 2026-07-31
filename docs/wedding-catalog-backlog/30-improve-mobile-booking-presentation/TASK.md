# Task 30: Improve mobile booking presentation

**Area:** mobile
**Priority:** P0

## Objective

Implement **Improve mobile booking presentation** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Use a full-screen sheet or dedicated page for mobile booking.
- Avoid nested scroll containers.
- Add safe-area padding.
- Keep primary action reachable without covering fields.
- Ensure the on-screen keyboard does not hide controls.

## Acceptance criteria

- [ ] Booking is usable on common iPhone and Android viewport sizes.
- [ ] Focus trap and Escape/back behavior are correct.
- [ ] Sticky actions do not overlap content.
- [ ] Desktop dialog behavior remains intact.

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
