# Task 40: Optimize hero video

**Area:** performance
**Priority:** P0

## Objective

Implement **Optimize hero video** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Provide WebM and MP4 sources.
- Provide a poster image and mobile fallback.
- Use muted and playsInline.
- Respect reduced motion.
- Avoid eager downloading that blocks LCP.
- Serve through CDN with appropriate cache headers.

## Acceptance criteria

- [ ] Hero text and CTA render before video.
- [ ] Mobile can use poster-only mode.
- [ ] Video does not become a critical LCP blocker.
- [ ] File size stays within the agreed performance budget.

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
