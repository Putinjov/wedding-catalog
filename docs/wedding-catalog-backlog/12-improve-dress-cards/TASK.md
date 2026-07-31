# Task 12: Improve dress cards

**Area:** catalogue
**Priority:** P1

## Objective

Implement **Improve dress cards** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Show designer, silhouette, status badge, featured/new badge, and previous price when relevant.
- Emphasize sale price in Buy mode and rental price in Rent mode.
- Use wording such as `Rent from €X`.
- Use a clear CTA such as `View dress`.
- Handle sold dresses with a Sold badge and similar-dresses CTA.

## Acceptance criteria

- [ ] Card content changes appropriately by mode.
- [ ] No card exposes internal SKU.
- [ ] Unavailable cards cannot trigger invalid purchase or rental actions.
- [ ] Card links remain fully keyboard accessible.

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
