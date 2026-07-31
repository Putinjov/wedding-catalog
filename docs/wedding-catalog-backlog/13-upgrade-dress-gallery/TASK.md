# Task 13: Upgrade dress gallery

**Area:** dress-detail
**Priority:** P1

## Objective

Implement **Upgrade dress gallery** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add lightbox, zoom, swipe, keyboard arrows, Escape close, focus trap, and accessible controls.
- Support product video already stored in CMS.
- Use responsive thumbnails and prioritize only the main image.
- Respect reduced-motion preferences.

## Acceptance criteria

- [ ] Full-size images are not all eagerly downloaded.
- [ ] Gallery works with keyboard only.
- [ ] Mobile swipe does not block vertical scrolling.
- [ ] Video has accessible controls or appropriate autoplay restrictions.

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
