# End welcome offer — production fee cutover

## Проблема та реалізація

Користувач явно погодив вимкнення welcome offer після наскрізного Preview-тесту €20 та €0 Follow-up. siteConfig тепер задає стандартну плату €20 без promotion. Buy/Rent використовує стандартний pending-payment/Stripe lifecycle; серверно підтверджений Follow-up залишається confirmed/unpaid за €0 без Stripe.

Зміни: src/config/site.ts; tests/int/fitting-fee-offer.int.spec.tsx (стандартна ціна без del/promotion, explicit waiver); tests/int/booking-dress-availability.int.spec.ts (стандартний payment hold); tests/int/repeat-booking-local-flow.int.spec.ts (явна нульова test-only початкова фікстура для незалежної перевірки ручного linking та repeat entitlement); цей звіт.

## Дані та відкат

Нової схеми/міграції немає. Існуючі appointments зберігають записану fittingFee та lifecycle: раніше видані €0 записи не стають платними. Не переписувати їх при cutover або rollback. Відкат конфігурації впливає лише на нові записи; вже створені €20 записи не змінюють своїх сум.

PR залежить від #63. Перед production deployment потрібне підтвердження його migration gate. Live Stripe key/webhook secret не змінюються цим PR. Тимчасові test guards, конфігураційні deployments і automation bypass не входять у diff та не promote-яться.

## Перевірка

Платний Preview раніше підтвердив реальний test-mode Checkout €20, confirmed/paid, email і ідемпотентний replay; окремий Follow-up confirmed/unpaid €0 без session/hold. Це не production/live-charge smoke check. Зміна OTP у #63 вимагає власного CI.

Для цього commit локально виконується DB-незалежний suite, lint/TypeScript. Повні DB-тести, generated artifacts, migrations і production build перевіряє GitHub CI з тимчасовою MongoDB: локальний Docker за рішенням користувача пропускається. Не merge-ити при падінні CI. Опт-in DB-flow і screenshots не виконані локально; не заявляються нові axe/keyboard/mobile результати.

## Manual verification

Після deployment перевірити Buy/Rent без OTP, €20 без Welcome offer/Temporarily free чи перекреслення, перехід нової броні до Stripe. Follow-up має вимагати OTP й надавати €0 лише після серверної перевірки. Перевірити збереження старих €0 записів без нарахування €20, noindex/no-store приватних сторінок і відсутність promotion у public UI.

## Privacy, accessibility, SEO/cache та ризики

Персональні дані, consent, identities та логування не змінені. Labels/live regions/keyboard targets збережені; змінюється лише відображення ціни. Canonical/sitemap/private headers не змінені, статичний public контент оновлюється новим deployment. Live webhook має бути підтверджений production smoke checks без справжнього тестового списання; автоматичні screenshots і повний accessibility audit не виконувалися для цього cutover.

Наступний крок: зелений CI → merge focused cutover PR після #63 → погоджений production deployment/smoke checks. Production migration gate і production-готовність не можна підміняти успішним Preview.
