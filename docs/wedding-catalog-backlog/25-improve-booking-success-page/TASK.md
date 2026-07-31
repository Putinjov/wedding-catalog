# Task 25: Improve booking success page

**Area:** booking
**Priority:** P0

## Objective

Implement **Improve booking success page** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Poll while payment status is processing.
- Show appointment date, time, purpose, selected dress, and reference.
- Show address, map link, arrival instructions, what to bring, email confirmation note, contact details, and Add to Calendar.
- Handle success, processing, expired, conflict, and failure states.

## Acceptance criteria

- [ ] Refresh does not break the page.
- [ ] Processing resolves without manual reload.
- [ ] Calendar export uses correct timezone.
- [ ] Private data remains noindex and no-store.

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
