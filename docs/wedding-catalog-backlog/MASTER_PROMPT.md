# Master prompt for Codex

You are working in the GitHub repository `Putinjov/wedding-catalog`.

Your job is to implement the backlog contained in this package safely, incrementally, and in dependency order. Do not attempt all tasks in one commit or one pull request. The project is a production wedding-dress boutique catalogue built with Next.js 16, React 19, Payload CMS 3, MongoDB, Stripe, Cloudflare R2, and Vercel. It supports both dress sales and rentals, private fitting bookings, and a paid fitting fee.

## Non-negotiable product rules

1. Every dress is individually fitted and professionally altered for the customer.
2. Do not add public size filters or customer-facing dress-size logic.
3. Buying and renting are separate commercial modes with separate availability.
4. A dress may be public even when sold, but it must not remain purchasable.
5. Customer-specific booking and payment URLs must remain private, noindex, and no-store.
6. The backend is authoritative for availability, booking rules, payment state, and privacy consent.
7. Never log customer phone numbers, notes, full email content, secrets, or unnecessary Stripe data.
8. Do not invent ratings, reviews, prices, availability, addresses, or business information.
9. Preserve Europe/Dublin timezone behavior, including DST boundaries.
10. Avoid unrelated cleanup and broad rewrites.

## Required execution strategy

Work in this order:

### Phase 1: indexation and routing safety
Tasks 01, 02, 03.

### Phase 2: dress domain model
Tasks 04, 05, 06, 07.

### Phase 3: catalogue
Tasks 08, 09, 10, 11, 12.

### Phase 4: dress detail and navigation
Tasks 13, 14, 15, 16.

### Phase 5: booking domain
Tasks 17, 18, 19, 20, 27.

### Phase 6: Stripe and booking reliability
Tasks 21, 22, 23, 24, 25.

### Phase 7: admin workflow
Task 26.

### Phase 8: accessibility and mobile
Tasks 28, 29, 30, 31.

### Phase 9: structured data and indexation policy
Tasks 32, 33, 34.

### Phase 10: performance
Tasks 35, 36, 37, 38, 39, 40.

### Phase 11: production operations
Tasks 41, 42, 43, 44, 45.

## Pull request rules

Create one focused PR per architectural theme. A PR may combine tightly coupled tasks only when they share the same migration and cannot safely be separated. Never combine unrelated SEO, schema, booking, UI, and infrastructure work merely to reduce PR count.

Each PR must include:

- a concise problem statement;
- implementation summary;
- files changed;
- migration notes;
- rollback notes;
- tests added or updated;
- screenshots for UI changes;
- manual verification steps;
- known limitations;
- no unrelated formatting churn.

## Before editing each task

1. Read the corresponding `TASK.md`.
2. Inspect all current files involved.
3. Identify existing shared utilities and tests.
4. State the planned file changes.
5. Identify schema migration, cache invalidation, SEO, accessibility, and privacy implications.
6. Confirm dependencies from earlier tasks are already present.
7. Do not guess the repository structure when it can be inspected.

## Implementation standards

- Prefer shared domain utilities over route-specific logic.
- Keep state machines explicit and tested.
- Use server components unless client interactivity is required.
- Use server-side filtering and pagination for catalogue data.
- Normalize and validate URL parameters.
- Validate redirects to prevent open redirects.
- Keep canonical URLs free of tracking, filter, and mode query parameters unless the task explicitly defines otherwise.
- Use Payload hooks for cache and sitemap invalidation.
- Keep Stripe webhook handling idempotent.
- Keep email sending outside the critical webhook transaction.
- Make cron jobs bounded, authenticated, observable, and idempotent.
- Add indexes for critical query and uniqueness paths.
- Respect reduced motion, keyboard navigation, screen readers, safe-area insets, and minimum touch target sizes.
- Do not represent rental pricing as a normal sale Offer in structured data.
- Do not expose internal SKU in customer UI.

## Validation commands

Run from a clean checkout whenever feasible:

```bash
npm ci
npm run generate:types
npm run generate:importmap
git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run lint
npm run test:int
npm run build
```

Also run focused tests for the changed domain. For UI work, verify mobile and desktop. For accessibility work, run axe and keyboard-only flows. For SEO work, inspect rendered metadata, canonical links, robots headers, sitemap XML, and JSON-LD. For payment work, replay Stripe webhook events and verify idempotency.

## Stop conditions

Stop and report instead of improvising when:

- a business rule is ambiguous and changes money, availability, privacy, or legal behavior;
- a migration could destroy or silently reinterpret existing data;
- production credentials or provider configuration are required;
- a task depends on an earlier schema or utility that is not yet merged;
- current tests reveal an unrelated pre-existing failure;
- the requested implementation would expose customer data.

## Required task completion output

After each task or PR, provide:

1. Summary.
2. Files changed.
3. Data migration.
4. Tests.
5. Manual verification.
6. Security/privacy review.
7. Accessibility review.
8. SEO/cache implications.
9. Remaining risks.
10. Exact next task recommended.

Begin with Task 01. Do not move to the next task until Task 01 passes validation and its completion report is produced.
