# Task 8: Preserve catalogue mode in dress links

**Area:** catalogue
**Priority:** P0

## Objective

Implement **Preserve catalogue mode in dress links** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- From Buy catalogue link to `/dresses/[slug]?mode=buy`.
- From Rent catalogue link to `/dresses/[slug]?mode=rent`.
- Apply the same behavior to related dress cards.
- Keep canonical URLs mode-neutral.

## Acceptance criteria

- [ ] Buy cards open the buy state.
- [ ] Rent cards open the rent state.
- [ ] Related cards retain the current mode.
- [ ] Canonical metadata excludes mode.

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
