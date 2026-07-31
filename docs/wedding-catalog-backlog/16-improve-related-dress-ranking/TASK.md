# Task 16: Improve related dress ranking

**Area:** recommendations
**Priority:** P1

## Objective

Implement **Improve related dress ranking** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Rank by same category plus silhouette, then silhouette, designer, similar price, and featured fallback.
- Reuse shared public availability filters.
- Cache related results.
- Track related-card clicks.

## Acceptance criteria

- [ ] Unavailable dresses never appear.
- [ ] Current dress is excluded.
- [ ] Mode is preserved in links.
- [ ] Ranking is deterministic and tested.

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
