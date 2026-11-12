# Provider-перевірка PR #63 — 12 листопада 2026

## Обсяг і результат

Перевірено код PR `c9503f0` та окрему похідну тестову копію з платним першим візитом. Тимчасові guards, утиліти підготовки даних, конфігураційні deployments і вимкнення welcome offer **не входять у PR** й не повинні merge/promote у Production. Цей звіт доповнює історичні звіти: попередні позначки «provider-перевірка не виконана» описують стан на дату тих прогонів.

## Підтверджені сценарії

- Користувач отримав справжній OTP-лист і підтвердив контрольний email у конкретному Preview deployment. Branch alias раніше давав origin 403; origin-захист не послаблено.
- Ізольована Preview-база має всі 18 наявних міграцій. Перевірки вимагали точні database/user та test-mode Stripe key; секрети не експортувалися з Vercel.
- Користувач завершив test-mode Checkout €20. Payload підтвердив confirmed/paid, fittingFee=20 EUR, amountPaid=2000, paidAt і відсутність конфлікту. Сесія Stripe complete/paid, livemode=false, сума й зв'язок із записом збігаються.
- Реальна подія checkout.session.completed знайдена в Stripe та як processed у Payload. Підтвердження email має один запис зі status=sent; користувач підтвердив отримання листа й success-сторінку.
- Два одночасні HTTP replay саме отриманої події, повторно підписані чинним тестовим secret, повернули 200. Знімки appointment, processed events та email deliveries до/після ідентичні. Це не Stripe Dashboard Resend.
- Success-сторінка: 200, noindex, no-store, confirmed, €20 без del/line-through розмітки. Приватні URL та reference у звіті не публікуються.
- Після окремого дозволу користувача створено чітко позначений синтетичний минулий completed-візит, зв'язаний із контрольним профілем. Перед цим погоджений службовий privacy notice прийнятий SMTP; зафіксовано поточний час і метод email, без вигаданої acknowledgement чи маркетингової згоди. Невдалі попередні транзакції відкочені.
- Користувач пройшов Follow-up на тому самому Preview. Незалежна read-only перевірка: confirmed/unpaid, fittingFee=0, без Checkout Session, PaymentIntent і hold; один confirmed email зі status=sent; той самий customer profile. Початковий оплачений візит залишається confirmed/paid за €20.

## Перевірки та файли

Код PR: 705 інтеграційних тестів пройшли, 2 opt-in тести пройшли окремо; типи/importMap без змін, lint без помилок, TypeScript/build успішні. CI для c9503f0: success (run 42883983515), Vercel Preview: success. Залишається попередній warning dirname у Media.ts та діагностика expo/tsconfig.base для окремого manager app.

Технічна тестова копія: чисте npm ci, 36 цільових Stripe/repeat тестів, 32 guard/endpoint-selection тести, ESLint і TypeScript утиліт; платний Preview build успішний. Read-only перевірка Follow-up: deployment dpl_d6fCXGtU7JLQ7nXqkSRjEkQc723h, Ready. Повний suite не повторювався після кожної зміни лише одноразових утиліт. Перед remote-запусками виправлені локальні помилки типізації цих утиліт.

Поточне оновлення PR змінює лише цей звіт і посилання на нього в repeat-booking-verification.md. Runtime, залежності, схема й згенеровані файли не змінені; повторний повний локальний suite для документації не запускався. Окремі попередні UI screenshots, axe/keyboard/mobile результати наведені у follow-up-email-code.md; новий повний accessibility-прогін не заявляється.

## Міграції, відкат і Production

Provider-прогін не додає міграцій. PR містить `20261025_180000_add_customer_verification_claims` і `20261101_120000_add_follow_up_booking_purpose`; перед Production потрібен окремо погоджений migration gate на перевіреній Production-базі. Стан Preview не підтверджує Production.

Claims зберігати, доки вони забезпечують одноразовість. Індексний rollback відмовляється за наявності записів; follow_up не можна автоматично перейменувати на undecided. Для відкату після появи цих даних потрібне окреме рішення. Welcome offer у самому PR залишається активним: платний режим перевірено окремою копією, його production cutover не є частиною цього оновлення.

## Безпека, приватність, accessibility, SEO/cache

Окремий погоджений Vercel automation-секрет використано лише для тестового webhook; попередній секрет і загальний захист збережені. Сам bypass має project-wide дію; його env-змінна доступна лише тестовій Preview-гілці. Перенаправлено тільки єдиний test-mode Stripe endpoint із production-домену на конкретний тестовий deployment, без зміни signing secret або набору подій. Live endpoint не змінювався. Запит без bypass залишається 401.

Не публікуються секрети, параметризовані bypass-URL, email-коди, customer reference, телефони, нотатки, повний вміст листів чи Stripe payload. Утиліти використовують Payload Local API, обмежені вибірки й безпечні підсумкові маркери. Доменні валідації не вимикалися; notifications пригнічені лише в процесі підготовки synthetic fixture, а не в сайті. Поточна документаційна зміна не впливає на UI, accessibility, canonical, sitemap або cache.

## Обмеження і точний наступний крок

- Успішні provider-сценарії не замінюють Production smoke checks, новий migration gate або перевірку live-конфігурації.
- Старі візити зв'язуються вручну. Дворічні, purchase-block і OTP edge cases покриті автоматизованими тестами, але всі вони не повторювалися вручну в Preview.
- Тестові записи збережено. Після завершення роботи окремо погодити cleanup тестової інтеграції та відкликання нового automation-секрету; не чіпати попередній секрет.
- Наступний крок: після CI документаційного оновлення погодити mark ready → merge PR #63; потім окремо Production migration gate і deployment. Тимчасову платну Preview-копію не merge-ити й не promote-ити.
