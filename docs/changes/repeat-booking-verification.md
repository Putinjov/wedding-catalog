# Booking email verification and two-year repeat entitlement

Актуальний результат provider-перевірок за 11–12 листопада 2026: [OTP, тестова оплата €20, replay та Follow-up €0](repeat-booking-provider-verification.md). Історичні обмеження нижче слід читати з урахуванням цього звіту; Production-випуск усе ще потребує окремого погодження.

## Problem

The current welcome offer confirms every online fitting at €0. Once the offer ends, the booking backend needs a private, reliable way to distinguish a first/expired fitting from a repeat visit, and to close online booking after a confirmed purchase. A browser-supplied “returning customer” flag would not be authoritative.

## Implementation

- Require a six-digit email code for **every** online booking, including the first. Codes are sent independently of account existence. A cryptographically random, 15-minute code is bound to an encrypted HttpOnly, SameSite=Strict browser challenge; it is never returned in JSON or placed in a URL. A successful POST yields a 30-minute HttpOnly verified-email cookie. Outstanding legacy links remain redeemable until their original expiry, but no new links are issued.
- Offer Buy, Rent, and **Follow-up appointment** publicly. A follow-up requires email verification and a server eligibility check before the calendar; the selected date is checked again in the fee quote, appointment action and Payload hook. Ineligible follow-ups stop with guidance, never silently proceed to a paid appointment. Historical `undecided` remains unchanged and visible to staff.
- Store only hashed, short-lived issuance, attempt and redemption claim keys. Five atomic attempt slots per challenge enforce the code-guess limit across server instances and concurrent requests. A unique MongoDB index makes redemption single-use; a TTL index removes claims after 24 hours. Persistent per-address and per-IP issuance limits supplement process-local request/redemption limits. Repeat issuance within the same 15-minute bucket does not issue another challenge or reset attempts.
- Resolve the fee on the server from the verified normalized email, a private customer profile, and the latest **linked, completed** appointment whose end is in the past. The chosen new fitting date must fall no later than the two-year Europe/Dublin calendar anniversary of that visit. Each subsequent completed visit renews the window. A confirmed purchase closes online booking; staff arrange later visits by phone.
- The review step requests a server-side quote, but appointment creation and its Payload hook recalculate the decision before writing payment state. Stripe Checkout also rechecks confirmed purchases. Repeat appointments start `confirmed`/`unpaid` at €0 and never enter Stripe Checkout. Standard appointments retain the configured fee and `pending_payment` lifecycle.
- New verified bookings create and link a private customer profile if necessary. Historical appointments are **not** linked automatically; staff must review and link them before they can establish a repeat entitlement.
- The current welcome offer and Stripe credentials are unchanged. This PR does **not** switch the standard €20 fee on.

## Files changed

The focused changes are in `src/lib/customers/`, `src/lib/booking/createAppointment.ts`, `src/lib/booking/getBookingFeeQuote.ts`, the booking email-verification routes and UI, `src/collections/CustomerVerificationClaims.ts`, `src/migrations/`, generated Payload types, and corresponding integration/e2e tests. `src/config/indexation.ts` adds private headers for the verification page.

## Migration and rollback

`20261025_180000_add_customer_verification_claims` adds a unique claim-key index and a 24-hour TTL expiry index. It does not rewrite profiles or appointments. Run the approved migration gate before deploying code that accepts verification requests. Rollback removes indexes only if there are no claim records; after requests exist, preserve records and review a rollback plan. Reverting the application without dropping data returns the previous booking flow, but the welcome offer must remain active until Stripe and the new paid flow are verified.

`20261101_120000_add_follow_up_booking_purpose` validates the additive `follow_up` purpose without rewriting records. Its rollback refuses if records cannot be represented by the prior buy/rent/undecided schema. Do not relabel follow-ups as undecided to force a rollback. OTP attempts reuse the existing claim collection and indexes; no plaintext codes, addresses or code digests are added to that collection. The manager app receives the new type/display label but its build is outside the web validation suite.

## Tests and manual verification

- Run `npm ci`, `npm run generate:types`, `npm run generate:importmap`, `npm run lint`, `npm run test:int`, a fresh local migration run plus mandatory migration check, and `npm run build` against a local test database.
- Test a first verified booking, an unverified booking rejection, a linked completed repeat inside and outside the two-year window, a confirmed purchase, token expiry/replay/concurrent redemption, email send failure/retry, and Stripe bypass for €0.
- In Preview, select Follow-up appointment, enter the previously used email and request a code. Enter it in the same browser (mobile and desktop); check wrong, expired, replayed and exhausted codes. Check another email cannot reuse the cookie. Confirm an eligible customer can reach the calendar and a customer without a linked completed visit cannot. Check the chosen visit date is still inside the two-year limit and a purchase closes online booking. Inspect private API headers and keyboard, screen-reader and axe behavior.
- Screenshots: [verification desktop](repeat-booking-verification-desktop.png), [verification mobile](repeat-booking-verification-mobile.png), [booking form desktop](repeat-booking-form-desktop.png), [booking form mobile](repeat-booking-form-mobile.png).

## Security, privacy, accessibility, SEO and cache

No customer phone, notes, full email content, secret, or Stripe payload is logged. Verification responses are generic until the email is proved. Tokens are never stored in plaintext, the verification page is `noindex`/`no-store`, and email-status requests are private POSTs. The public booking page does not server-render a verified email. Buttons have at least 44px targets and status updates use a live region. No public canonical, sitemap entry, catalogue cache, or dress availability changes.

## Known limitations

- Legacy visits require manual profile linking. There is no automatic historical backfill or data reinterpretation.
- The welcome offer still makes the configured public fee €0. The eventual €20 cutover and changed Stripe account need a separate reviewed release and provider smoke test.
- Live Google Workspace delivery has not been exercised with a customer address in local tests. The existing process-local IP limiter is not shared across instances; unique database claims enforce the per-address and per-IP issuance quotas.
- A lost challenge cookie, browser switch or lost issuance response requires waiting for the address issuance window before requesting another code. This conservative retry policy avoids resetting brute-force attempts; no code is stored in localStorage or sessionStorage.
- The owner confirmed that a 29 February visit remains eligible through 28 February, inclusive, two years later. A requested visit on 1 March is outside the free window.

## Локальна повторна перевірка після оновлення від master — 2026-11-01

**Історичний звіт нижче стосується попереднього magic-link варіанта cdad42b, а не нових OTP/follow-up змін. Поточні результати наведено в окремому звіті follow-up-email-code.md.**

- Гілка містить master `a61b395` із виправленнями контрасту діалогу й очікуваного заголовка головної. Незакомічені тести збережені під час merge; production-код цього PR додатково не змінювався.
- `npm ci --no-audit --no-fund`, генерація types/importMap і перевірка їх diff пройшли. `npm run lint` завершився без помилок із попереднім warning про `dirname` у `src/collections/Media.ts`.
- `npm run test:int`: 674 passed, 2 skipped. Два пропущені за замовчуванням сценарії потребують явного opt-in і запускаються окремо лише на тимчасовій локальній MongoDB.
- Окремий запуск із `LOCAL_BOOKING_FLOW_TEST=true`: 2 passed. Перевірено доставку посилання в поштову скриньку в пам'яті, конкурентне одноразове підтвердження, створення зв'язаного повторного візиту за €0 без Stripe-сесії та заборону нового онлайн-запису після підтвердженої покупки.
- `tests/int/helpers/local-booking-environment.ts` вимагає `mongodb://127.0.0.1:<port>/repeat_booking_e2e?directConnection=true`, локальний origin і вимкнені SMTP/Stripe/R2/push. Тестові дані синтетичні; справжні листи не надсилаються.
- Тест підміни токена тепер гарантовано змінює перший символ, замість потенційного повторення початкового останнього символу.
- На порожній локальній базі виконано всі 17 міграцій; обов'язковий migration check підтвердив їх застосування. Production migration gate не запускався.
- `npm run build`: успішно, включно з TypeScript. Використані лише локальна MongoDB і фіктивні provider-ключі.
- Повний Playwright-набір у незалежному тестовому Chrome проти локального `next start`: 10 passed, 1 skipped. Пропущено лише opt-in сценарій створення скриншотів; перевірки desktop/mobile, axe, keyboard-only, reduced motion, каталогу, адмінки та сторінки підтвердження виконані.
- HTTP-перевірка зібраної `/book-a-fitting/verify`: 200, `private` та `no-store` у Cache-Control, `noindex` у X-Robots-Tag і rendered robots metadata. Перевірка не використовувала справжній token або email клієнта.
- Під час Vitest є діагностичне повідомлення про відсутній `expo/tsconfig.base` в окремому `apps/manager`; воно не спричинило падіння тестів. Мобільний застосунок цим PR не змінюється.

Для повторення двох локальних сценаріїв після налаштування описаного ізольованого середовища:

```text
npm run test:int -- tests/int/booking-verification-local-flow.int.spec.ts tests/int/repeat-booking-local-flow.int.spec.ts --maxWorkers=1
```

Ці результати не підтверджують доставку через Google Workspace, ізоляцію бази Vercel Preview або новий Stripe-акаунт. До завершення окремої provider-перевірки PR залишається draft, а welcome offer — активним.

## Конкурентне підтвердження OTP — 2026-11-10

### Проблема та виправлення

На локальній MongoDB 7 replica set два одночасні запити підтвердження одного коду давали HTTP 200 і 503 замість 200 і 410. У п'яти контрольних гонках програшна транзакція повертала MongoDB `WriteConflict` (112) із `TransientTransactionError`, а не помилку унікальності. Подвійного підтвердження не спостерігалося.

Спільний `createVerificationClaim` повторює лише цей підтверджений тимчасовий конфлікт: максимум три спроби, паузи 25 і 50 мс. Payload завершує rollback перед відхиленням незалежного `create`; наступна спроба починає нову транзакцію з тим самим ключем і строком зберігання. Унікальний індекс, як і раніше, визначає єдиного переможця. Дублікат повертає `false`; вичерпані повтори та інші помилки передаються далі. Невизначений результат commit не повторюється.

Змінені файли цього виправлення:

- `src/lib/customers/verificationClaims.ts` — обмежений повтор транзакції.
- `tests/int/verification-claim-retries.int.spec.ts` — регресійні перевірки успіху, дубліката, межі повторів і помилок, які не можна повторювати.
- `tests/int/booking-verification-local-flow.int.spec.ts` — додаткова перевірка повторного використання вже підтвердженого коду, відсутності нової сесії та збереження приватних заголовків.
- `docs/changes/repeat-booking-verification.md` — цей звіт.

### Дані, безпека та відкат

Нових міграцій або залежностей немає. Існуючі унікальний і TTL-індекси обов'язкові. Не змінено ліміт спроб введення коду, строк його дії, правила безкоштовного візиту, welcome offer, Stripe або персональні дані. Не додано логування кодів, адрес чи вмісту листів. Відкат лише цього виправлення не потребує зміни даних, але повертає ризик HTTP 503 при конкурентному підтвердженні.

UI та accessibility-розмітка не змінені; нові скриншоти та повторний візуальний прогін для цього серверного виправлення не виконуються. Приватні `no-store`/`noindex` заголовки перевіряються flow-тестом. Canonical, sitemap і кеш каталогу не змінені.

### Перевірка та обмеження

- Нові тести перед виправленням: 3 failed, 8 passed; після виправлення: 11 passed.
- На новій порожній локальній MongoDB застосовано й підтверджено всі 18 наявних міграцій до flow-тестів.
- Два opt-in flow-тести пройшли: одноразове конкурентне підтвердження з повторною відмовою, повторний запис €0 без Stripe та закриття онлайн-запису після покупки. Лист перехоплюється в пам'яті, зовнішні SMTP/Stripe/R2 вимкнені.
- П'ять додаткових конкурентних перевірок claims після виправлення: щоразу рівно один `true` і один `false`, без відхилених операцій.
- Повний `npm run test:int -- --maxWorkers=2`: 705 passed, 2 skipped; два пропущені за замовчуванням opt-in тести пройшли окремим запуском, зазначеним вище.
- Генерація types/importMap і перевірка diff згенерованих файлів — без змін. Lint — 0 errors, попередній warning `dirname` у `Media.ts`.
- `npm run build` — успішно, включно з обов'язковою перевіркою 18 міграцій, TypeScript і генерацією всіх 20 статичних сторінок. `git diff --check` — успішно.
- `npm ci` повторно не запускався: залежності та lockfile не змінені, використано наявне встановлення; чисте встановлення залишається кроком CI. Vitest також показує попередню діагностику відсутнього `expo/tsconfig.base` в `apps/manager`, без падіння web-тестів.

Окремо, до цього локального виправлення, Preview підтвердив email контрольного користувача: POST запиту коду та POST підтвердження повернули 200, інтерфейс показав підтверджений email і очікувану відсутність права на безкоштовний повторний візит. Це не перевірка успішного безкоштовного запису в Preview або нового Stripe-акаунта. Для ручного повторення слід використовувати конкретний deployment URL, що збігається з дозволеним origin; branch alias у поточній конфігурації відхиляється з 403. Захист origin цим виправленням не послаблюється.

Наступний крок після завершення повної локальної перевірки — погоджені commit/push у той самий draft PR #63, новий CI та перевірка на оновленому Preview. Після цього потрібен окремий перевірений перехід до платного першого запису та Stripe test-mode сценарію. Production, provider-секрети та welcome offer цим виправленням не змінюються.
