# Follow-up appointment and six-digit email verification

## Підсумок

Публічну кнопку Undecided замінено на Follow-up appointment. Старі записи не перейменовуються; натискання кнопки саме по собі не дає права на €0. Нові листи містять шестизначний код замість magic link.

Сервер перевіряє підтверджений email перед пошуком права на безкоштовний повторний візит. Потрібен зв’язаний із профілем завершений візит у межах двох календарних років Europe/Dublin і відсутність підтвердженої покупки. Для 29 лютого межа — 28 лютого включно через два роки. Кожний наступний завершений візит поновлює вікно згідно з раніше погодженою логікою. Старі записи потребують ручного зв’язування.

Перевірка виконується перед календарем і повторно для обраного слота. За відсутності права сайт не переходить до платного запису автоматично. Дозволений повторний запис створюється як confirmed/unpaid за €0 без Stripe.

## Змінені файли

- `apps/manager/src/lib/labels.ts`
- `apps/manager/src/types.ts`
- `docs/changes/follow-up-email-code.md`
- `docs/changes/follow-up-email-code-1280.png`
- `docs/changes/follow-up-email-code-390.png`
- `docs/changes/repeat-booking-form-desktop.png`
- `docs/changes/repeat-booking-form-mobile.png`
- `docs/changes/repeat-booking-verification.md`
- `src/app/(frontend)/api/booking/email-verification/redeem/route.ts`
- `src/app/(frontend)/api/booking/email-verification/route.ts`
- `src/app/(frontend)/book-a-fitting/page.tsx`
- `src/components/admin/appointments-calendar/calendar-filters.tsx`
- `src/components/admin/appointments-calendar/new-appointment-dialog.tsx`
- `src/components/booking/booking-flow.tsx`
- `src/components/booking/email-verification-control.tsx`
- `src/config/booking.ts`
- `src/lib/booking/createAppointment.ts`
- `src/lib/booking/getBookingFeeQuote.ts`
- `src/lib/booking/purpose.ts`
- `src/lib/customers/appointmentCustomer.ts`
- `src/lib/customers/emailVerification.ts`
- `src/lib/customers/repeatBooking.ts`
- `src/migrations/20261101_120000_add_follow_up_booking_purpose.ts`
- `src/migrations/index.ts`
- `src/payload-types.ts`
- `tests/e2e/booking-email-verification.e2e.spec.ts`
- `tests/e2e/booking-accessibility.e2e.spec.ts`
- `tests/int/booking-email-code.int.spec.ts`
- `tests/int/booking-email-verification-route.int.spec.ts`
- `tests/int/booking-email-verification-ui.int.spec.tsx`
- `tests/int/booking-form-semantics.int.spec.tsx`
- `tests/int/booking-intent-migration.int.spec.ts`
- `tests/int/booking-purpose.int.spec.tsx`
- `tests/int/booking-verification-local-flow.int.spec.ts`
- `tests/int/follow-up-purpose-migration.int.spec.ts`
- `tests/int/repeat-booking-create.int.spec.ts`
- `tests/int/repeat-booking-local-flow.int.spec.ts`

## Міграція та відкат

Перед випуском потрібно застосувати міграцію індексів підтвердження та нову `20261101_120000_add_follow_up_booking_purpose` через migration gate. Існуючі записи не переписуються. Спроби введення коду використовують наявний унікальний індекс claimKey і TTL. Відкат після появи follow_up блокується до окремого рішення щодо даних; автоматично перетворювати такі записи на undecided не можна.

## Безпека, приватність, SEO/cache та доступність

- Код випадковий, шестизначний, зі збереженням початкових нулів; діє 15 хвилин. Зашифрований HttpOnly cookie прив’язує його до браузера. П’ять атомарних спроб та одноразове використання захищають від конкурентного підбору й повторного підтвердження. Коди та дані клієнтів не записуються в логи чи URL.
- Відповідь на запит листа не розкриває наявність клієнта або покупки. Право на €0 перевіряється лише після підтвердження email. Старі посилання діють до початкового строку завершення, нові більше не видаються.
- API залишаються private/no-store/noindex. Опис сторінки згадує повторні візити; canonical залишається без query-параметрів. Sitemap, доступність суконь та політика кешу каталогу не змінені.
- Поле підтримує цифрову клавіатуру, one-time-code autofill, вставлення й Enter. Збережено підписи, live status та кнопки від 44px. Запізніла відповідь не підтверджує іншу адресу.
- Інструкцію payload застосовано до системного доступу для claims, явного контролю доступу та збереження контексту транзакції у hook.

## Результати перевірок

- `npm ci --no-audit --no-fund` — успішно.
- `npm run generate:types` та `npm run generate:importmap` — успішно; повторна генерація підтвердила незмінність файлів.
- `git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"` повертає 1 через єдине очікуване додавання follow_up до згенерованого типу; importMap не змінений.
- `npm run lint` — без помилок, із попереднім warning про dirname у Media.ts.
- `npx tsc --noEmit` — успішно.
- На новій порожній локальній MongoDB застосовано всі 18 міграцій; обов’язковий migration check підтвердив їх.
- Фінальний `npm run test:int` — 687 passed, 2 skipped. Окремий opt-in запуск двох тестів на реальній локальній базі — 2 passed: конкурентне підтвердження коду й безкоштовний повторний запис із забороною після покупки.
- Фінальний `npm run build` — успішно, включно з TypeScript та обов’язковою перевіркою міграцій. Використано лише localhost MongoDB та фіктивні provider-ключі.
- Фінальний браузерний прогін після уточнення тексту: 12 passed, включно з Chrome на desktop/mobile ширинах, axe, клавіатурою та reduced motion. Фізичний телефон і реальний screen reader окремо не перевірялися.
- Скріншоти desktop 1280px та mobile 390px переглянуті; горизонтального переповнення немає. Повносторінковий мобільний скріншот фіксує sticky-кнопку на нижній межі поточного viewport.
- Заголовки локального приватного API: no-store/private та noindex/nofollow/noarchive. Canonical публічної сторінки залишається без purpose та інших query-параметрів.

Скріншоти: [desktop](follow-up-email-code-1280.png), [mobile](follow-up-email-code-390.png). Зміни локально перевірені; перевірка доставки через справжній SMTP/Preview залишається відкритою перед випуском.

Перший повний прогін був запущений помилково до створення індексу: тест конкурентних claims утворив синтетичні дублікати, і міграція зупинилася. Тимчасовий контейнер прибрано; успішний прогін виконано на новій порожній базі строго після міграцій. Production не зачеплено.

Vitest показує попереднє діагностичне повідомлення щодо відсутнього expo/tsconfig.base для apps/manager; воно не спричиняє падіння suite. Окрема збірка мобільного застосунку не виконувалася; змінено лише тип і підпис follow_up.

## Ручна перевірка перед випуском

1. У Preview на desktop/mobile обрати Follow-up appointment і підтвердити контрольну пошту справжнім доставленим кодом у тому самому браузері.
2. Перевірити неправильний код, завершення строку, п’ять невдалих спроб, повторне використання, зміну email, клавіатуру та оголошення screen reader.
3. Перевірити профілі з правом на €0, простроченим правом, незв’язаними старими візитами й підтвердженою покупкою. Відмова не повинна створювати запис або відкривати оплату.
4. Перевірити підтвердження email для першого Buy/Rent та дату на дворічній межі.
5. Перед Preview-тестом застосувати міграції лише до перевіреної ізольованої бази. Перед production — окремий погоджений migration gate. Не використовувати справжні клієнтські записи для тестів.

## Обмеження та наступний крок

Використовується наявний SMTP adapter. Через 15-хвилинні вікна обмеження запитів втрата cookie може вимагати очікування перед новим кодом. Старі візити зв’язуються вручну. Локальні листи перехоплювалися в пам’яті; браузерні тести імітують лише email API, а реальні claims окремо перевірені на локальній MongoDB. Доставка через Google Workspace, Preview та новий Stripe-акаунт цим прогоном не підтверджені.

На момент завершення локальної перевірки Production/Preview, provider-секрети й welcome offer не змінювалися; commit/push ще не виконувалися. Наступний етап — публікація зазначених файлів у focused PR #63, потім ізольований Preview з міграціями й перевіркою справжнього коду на контрольній пошті. Актуальний стан публікації та CI фіксується в PR.

Після перевірки локальний сервер зупинено, тимчасові контейнери й їхні синтетичні дані прибрано. Клієнтські дані не видалялися.
