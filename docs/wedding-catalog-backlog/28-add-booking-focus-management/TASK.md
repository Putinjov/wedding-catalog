# Task 28: Add booking focus management

**Area:** accessibility
**Priority:** P0

## Objective

Implement **Add booking focus management** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Focus the heading after each booking step change.
- Focus the first invalid field after validation failure.
- Unify local and server field errors.
- Add `aria-current=step`, `aria-busy`, and live announcements.
- Ensure visual and DOM button order match.

## Acceptance criteria

- [ ] Keyboard-only users understand every transition.
- [ ] Screen readers announce errors and new steps.
- [ ] Server errors return focus to the correct step.
- [ ] No focus is lost inside modal or sheet presentation.

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
