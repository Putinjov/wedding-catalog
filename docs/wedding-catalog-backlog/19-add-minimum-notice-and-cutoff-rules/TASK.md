# Task 19: Add minimum notice and cutoff rules

**Area:** booking
**Priority:** P0

## Objective

Implement **Add minimum notice and cutoff rules** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add configurable minimum notice.
- Add configurable next-day cutoff.
- Support admin override separately.
- Apply rules in slot generation and final server validation.
- Add DST and timezone tests.

## Acceptance criteria

- [ ] Direct API submissions cannot bypass rules.
- [ ] UI and backend agree.
- [ ] Boundary times are tested in Europe/Dublin.
- [ ] Closed and blocked dates remain enforced.

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
