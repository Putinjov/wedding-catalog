# Task 36: Fix image quality and sizes

**Area:** performance
**Priority:** P0

## Objective

Implement **Fix image quality and sizes** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Remove global `quality={100}`.
- Use sensible defaults such as 75 for cards and 85 for main gallery.
- Keep allowed qualities aligned with Next config.
- Require explicit `sizes` for fill images.

## Acceptance criteria

- [ ] Generated image requests use allowed quality values.
- [ ] Responsive images are not substantially oversized.
- [ ] Visual quality remains acceptable.
- [ ] Lighthouse image warnings are reduced.

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
