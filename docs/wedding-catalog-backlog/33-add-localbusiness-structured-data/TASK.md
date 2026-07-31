# Task 33: Add LocalBusiness structured data

**Area:** seo
**Priority:** P1

## Objective

Implement **Add LocalBusiness structured data** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add BridalShop or suitable LocalBusiness schema to the homepage.
- Include verified name, URL, logo, phone, email, address, opening hours, social profiles, and geo only when confirmed.

## Acceptance criteria

- [ ] All details match visible site content.
- [ ] No unverified address or coordinates are published.
- [ ] Schema validates without warnings that indicate missing known business data.

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
