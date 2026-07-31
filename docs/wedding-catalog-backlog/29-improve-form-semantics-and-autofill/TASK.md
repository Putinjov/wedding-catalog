# Task 29: Improve form semantics and autofill

**Area:** accessibility
**Priority:** P0

## Objective

Implement **Improve form semantics and autofill** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add autocomplete attributes for name, email, and phone.
- Add required semantics and inputMode where appropriate.
- Explain required versus optional fields.
- Add notes character count.
- Use accessible descriptions for validation.

## Acceptance criteria

- [ ] Mobile autofill works.
- [ ] Screen readers identify required fields.
- [ ] Character count updates accessibly.
- [ ] Client and server errors share the same presentation.

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
