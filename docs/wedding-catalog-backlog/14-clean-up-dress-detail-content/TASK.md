# Task 14: Clean up dress detail content

**Area:** dress-detail
**Priority:** P1

## Objective

Implement **Clean up dress detail content** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Hide SKU from customer UI.
- Remove duplicate rental information.
- Show individual fitting and alteration trust copy.
- Separate sale and rental terms clearly.
- Add sold and unavailable states.
- Add sticky desktop summary and mobile booking CTA.

## Acceptance criteria

- [ ] Content reflects the active mode.
- [ ] Sold and unavailable states have no misleading CTA.
- [ ] Sticky UI does not cover content or conflict with modal overlays.
- [ ] Safe-area insets are handled on mobile.

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
