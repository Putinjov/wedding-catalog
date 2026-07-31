# Task 20: Add privacy and consent handling

**Area:** privacy
**Priority:** P0

## Objective

Implement **Add privacy and consent handling** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Show a privacy notice on customer details.
- Link to the privacy policy.
- Store consent timestamp and policy version where legally required.
- Keep marketing consent separate and optional.
- Document retention and deletion behavior.

## Acceptance criteria

- [ ] Booking consent is not bundled with marketing.
- [ ] Required consent is enforced server-side.
- [ ] PII is not exposed in logs or Stripe metadata.
- [ ] Privacy copy is reviewable in CMS or configuration.

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
