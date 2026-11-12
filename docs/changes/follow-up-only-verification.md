# Код лише для Follow-up — локальна реалізація, ще не validated

## Погоджена поведінка

Buy/Rent — гостьовий запис без OTP, зі стандартною поточною платою, без читання історії чи автоматичного прив'язування профілю. Follow-up — обов'язковий OTP, перевірене право на €0 за завершеним зв'язаним візитом і блокування після покупки. Загальну заборону після покупки неможливо застосувати до анонімного Buy/Rent без ідентифікації; користувач погодив цю модель.

Гостьовий запис зберігає контакти в appointment, але не створює customer і не використовує збіг email для прив'язування. Працівник має створити/зв'язати профіль після перевірки особи під час візиту, щоб completed-візит надавав право на Follow-up. Існуючі зв'язки не змінюються й не видаляються.

## Файли

- src/components/booking/booking-flow.tsx — OTP-контрол лише для Follow-up, немає блокування гостьового review за непідтвердженим email.
- src/lib/booking/createAppointment.ts — OTP і приватне рішення лише для Follow-up; Buy/Rent не створює/не прив'язує customer, не отримує персональної пільги й не розкриває purchase state.
- src/lib/booking/getBookingFeeQuote.ts — гостьова плата без профільних запитів; rate limit збережений; Follow-up залишається приватним.
- src/lib/customers/appointmentCustomer.ts — write-boundary відхиляє підміну guest customer/fee, зберігає перевірку Follow-up та ручне staff-зв'язування на update.
- tests/int/repeat-booking-create.int.spec.ts — Buy/Rent без коду/профілю, стандартна плата, захист від підміни, Follow-up залишається захищеним.
- tests/int/customer-profile-foundation.int.spec.ts — обов'язковий профіль для Follow-up, не для гостей.
- tests/int/booking-form-semantics.int.spec.tsx, tests/int/booking-focus-management.int.spec.tsx, tests/int/booking-privacy-ui.int.spec.tsx — гостьове проходження без OTP; перевірки privacy та фокуса збережені.
- tests/int/repeat-booking-local-flow.int.spec.ts — явне ручне створення/зв'язування профілю перед перевіркою повторного візиту; оновлений DB-flow ще не запущений.
- tests/e2e/booking-email-verification.e2e.spec.ts — screenshot-сценарій гостьової форми не очікує OTP; браузерний прогін ще не виконаний.
- docs/changes/follow-up-only-verification.md — цей звіт.

## Валідація

- 38 цільових domain/UI/OTP/privacy/focus тестів — passed (7 файлів).
- Широкий прогін без api.int.spec.ts і customer-verification-claims.int.spec.ts: 704 passed, 1 failed, 2 skipped. Єдине падіння — deployment-routes health очікує MongoDB-backed 200, отримує 503 за відсутності локальної бази. Це не зелений повний suite; тест не послаблювався.
- npm run lint — без помилок, попередній warning dirname у Media.ts.
- npx tsc --noEmit — успішно до додавання двох останніх test-only перевірок; наступний фінальний прогін усе ще потрібний.
- generate:types, generate:importmap та diff generated files — без змін; git diff --check — успішно.
- npm ci повторно не запускався: залежності й lockfile не змінені.
- Docker CLI/mongod у поточному оточенні не знайдені; каталог Docker не містить потрібного executable. Повні DB-тести, migration check, production build, opt-in flows та desktop/mobile/axe/keyboard перевірки ще не завершені. Production/Preview база не використовується як заміна тимчасовій локальній базі.

## Міграції, відкат, безпека, доступність і SEO/cache

Нових полів/міграцій немає. Відкат коду повертає обов'язковий OTP для всіх; створені гостьові записи лишаться без customer і потребуватимуть ручного зв'язування, тому не слід підміняти їхні дані при rollback. Існуючі claims/follow_up міграції PR залишаються обов'язковими.

Welcome offer та Stripe-конфігурація не змінені: стандартна плата означає поточну siteConfig.fittingFee, не примусове ввімкнення €20. Рейтліміти й privacy acknowledgement збережені. Не додано логування клієнтських даних, кодів чи секретів. Гостьове бронювання не є доказом володіння email. Після покупки закривається лише підтверджений Follow-up.

Приватні noindex/no-store маршрути, canonical, sitemap і каталоговий кеш не змінені. OTP labels/live region залишені для Follow-up; тести фокуса й privacy пройшли, але browser accessibility/UI ще потребують перевірки.

## Наступний крок

Відновити локальну ізольовану MongoDB/Docker; виконати migrations → check → повний suite й opt-in flows → build → desktop/mobile/axe/keyboard. Старі provider-результати PR #63 не підтверджують нову зміну політики OTP. До повної валідації не commit/push/merge як validated. Поточні зміни локальні; Production, Preview й secrets не змінені.
