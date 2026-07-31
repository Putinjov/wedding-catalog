# Task 17: Create Booking Settings global

**Area:** booking
**Priority:** P0

## Objective

Implement **Create Booking Settings global** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Move duration, hold duration, booking horizon, minimum notice, cutoff, weekday hours, Saturday hours, lunch breaks, buffers, holidays, closures, blocked intervals, and timezone into a Payload Global.
- Use the same resolved settings in frontend and backend.
- Add safe defaults and validation.

## Acceptance criteria

- [ ] Settings changes do not require deploy.
- [ ] Backend remains authoritative.
- [ ] Europe/Dublin timezone is used consistently.
- [ ] Invalid settings cannot be saved.

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
