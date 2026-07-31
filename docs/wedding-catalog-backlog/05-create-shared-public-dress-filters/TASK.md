# Task 5: Create shared public dress filters

**Area:** domain
**Priority:** P0

## Objective

Implement **Create shared public dress filters** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Create one reusable builder for public dress query conditions.
- Use it in Buy catalogue, Rent catalogue, related dresses, booking validation, sitemap, and search.
- Represent mode-specific status requirements explicitly.
- Add unit tests for all status combinations.

## Acceptance criteria

- [ ] No public query duplicates its own availability logic.
- [ ] Booking backend revalidates the selected dress against current public rules.
- [ ] Unavailable dresses never appear in related results.
- [ ] All tests cover sale, rental, sold, rented, cleaning, repair, hidden, and archived states.

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
