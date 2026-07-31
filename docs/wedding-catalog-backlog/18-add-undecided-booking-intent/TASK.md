# Task 18: Add undecided booking intent

**Area:** booking
**Priority:** P0

## Objective

Implement **Add undecided booking intent** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add `undecided` alongside buy and rent.
- Expose customer copy such as `I’m not sure yet`.
- Update validation, appointment records, admin UI, summaries, and emails.

## Acceptance criteria

- [ ] Undecided bookings can be completed and paid.
- [ ] Selected dress may still be recorded.
- [ ] Admin workflows display the state clearly.
- [ ] No code assumes only buy or rent.

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
