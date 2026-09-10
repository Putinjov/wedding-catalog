# Новий графік примірок — focused migration PR

## Проблема та реалізація

Власник погодив примірки в неділю/понеділок 10:00–17:00, вихідні вівторок/четвер та тривалість 90 хвилин. Сумісність відкритої неділі вже розгорнута в Production: PR #53, merge commit `564ee1c`.

Міграція `20260909_213000_update_fitting_schedule` змінює лише `closedWeekdays`, `durationMinutes`, `weekdayHours` global `booking-settings` через Payload Local API з тим самим transaction request. Інші налаштування, субота, виняткові закриття та існуючі appointments не переписуються.

Приймається лише повний збережений очікуваний старий графік (60 хвилин, 0/1 закриті, 10–17) або вже застосований новий. Повторний запуск не робить запису. Неочікувані/неповні налаштування чи перерви на нових вихідних зупиняють міграцію.

Кеш отримує новий key part `schedule-20260909`, але зберігає `global_booking-settings` і чинний Payload hook. Після gate потрібно розгорнути цей commit: звичайний redeploy старого коду сам по собі не очищає постійний Data Cache. На відміну від початкового ручного плану, новий ключ не вимагає повторного збереження global через CMS для першого читання новим release.

## Файли

- `src/migrations/20260909_213000_update_fitting_schedule.ts`
- `src/migrations/index.ts`
- `src/lib/booking/settings.ts` — лише ключ кешу
- `tests/int/updated-fitting-schedule.int.spec.ts`
- `tests/int/booking-settings-cache.int.spec.ts`
- `tests/int/updated-fitting-calendar.int.spec.tsx`
- `docs/changes/fitting-schedule-migration.md`

Terms, футер, адмінський label і backlog caching не входять у PR.

## Міграція, rollout та rollback

1. Після перевірок і окремого дозволу merge PR.
2. Окремо погодити й запустити Production migration gate на merge commit. До gate Vercel Production build може очікувано зупинитися на pending migration. Чинний production release залишається сумісним.
3. Після успіху gate розгорнути новий merge commit із новим ключем кешу. Не вважати старий frontend доказом застосованого графіка між цими кроками.
4. Перевірити CMS global, календар, тривалість та JSON-LD. За 10–17 можливі початки: 10:00, 11:30, 13:00, 14:30. Не створювати реальні тестові бронювання без окремого дозволу.

Схема та індекси не змінюються. Автоматичний `down` заборонений: після запуску вже можуть існувати недільні/понеділкові та 90-хвилинні appointments. Повернення графіка потребує окремого рішення власника; існуючі записи не можна мовчки скорочувати або скасовувати. Не відкочувати до коду, який примусово забороняє неділю.

## Перевірки

Ізольований worktree від актуального `master` `564ee1c`. Перевірки завершено 10 вересня 2026 року.

- `npm ci`: успішно; попередження про deprecated transitive `tsconfck`.
- Focused suite: 27/27.
- Фінальний `npm run test:int -- --maxWorkers=1 --no-file-parallelism`: **541/541, 72 файли**, 168.09 с, включно з тестом компонента календаря.
- `npm run generate:types`, `npm run generate:importmap` і generated diff: успішно, drift відсутній.
- `npm run lint`: без помилок, лише попереднє попередження `dirname` у `src/collections/Media.ts`. Новий календарний тест також окремо перевірено ESLint.
- `npm run build` та `npx tsc --noEmit --incremental false`: успішно.
- `git diff --check`: успішно. Залежності, schema та generated files не змінені.
- Read-only Production preflight: persisted global існує, 60 хвилин, вихідні 0/1. Міграції не запускались.

Build використовував дозволений read-only Atlas доступ. Секрети не копіювалися у worktree й не виводилися; email/службові placeholders задавалися лише process environment.

Тести: guarded/idempotent migration, відсутній global, неповні поля, конфліктні перерви, rollback, 90-хвилинні слоти, обидва DST transitions Europe/Dublin, перетини з існуючими 60-хвилинними записами, calendar selection та спільний cache invalidation tag.

## Ручна перевірка після gate та deploy

- На mobile/desktop календар дозволяє майбутні неділю й понеділок, блокує вівторок/четвер, показує 90 хвилин.
- Доступні старти закінчуються не пізніше закриття; зайняті інтервали існуючих записів лишаються заблокованими.
- `/contact` і openingHoursSpecification головної узгоджені з новим CMS global.
- Існуючі підтверджені записи не змінюють `startAt`/`endAt`; не перепубліковувати їхні приватні URL у звітах.

## Security/privacy, accessibility, SEO/cache

Не додаються персональні дані, логування customer data, email чи Stripe-операції. Міграція не читає appointments. Валідація слотів лишається серверною. Приватні headers/consent не змінюються.

UI-компоненти не змінені; скріншоти нового production-графіка до застосування міграції не заявляються. Календар перевірений з новими налаштуваннями в тесті компонента; mobile/desktop smoke нового графіка потрібен після deploy.

Canonical, sitemap і Product JSON-LD не змінюються. Business opening hours автоматично використовують нові налаштування; новий ключ кешу виключає повторне використання старого графіка після rollout. Подальші CMS edits використовують чинний Payload hook.

## Наступний точний крок

Перевірити CI/Vercel Preview цього PR. Потім окремо погодити merge → Production migration gate → production redeploy → smoke checks.
