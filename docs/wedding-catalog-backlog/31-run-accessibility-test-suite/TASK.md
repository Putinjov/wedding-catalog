# Task 31: Run accessibility test suite

**Area:** accessibility
**Priority:** P1

## Objective

Implement **Run accessibility test suite** in `Putinjov/wedding-catalog` without unrelated refactoring.

## Scope

- Add axe checks.
- Add Playwright keyboard-only booking tests.
- Check contrast, 200% zoom, reduced motion, VoiceOver, and TalkBack.
- Document manual smoke-test results.

## Acceptance criteria

- [ ] No critical axe violations.
- [ ] Booking completes keyboard-only.
- [ ] All touch targets meet minimum size.
- [ ] Reduced-motion users do not receive unnecessary autoplay animation.

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
