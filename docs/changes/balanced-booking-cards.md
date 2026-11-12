# Збалансовані картки вибору візиту

Користувач затвердив перший («Редакційні») варіант попередньої візуалізації зі збільшеними описами. Реалізовано окремі eyebrow/title/description: First appointment → Buy/Rent, Returning bride → Follow-up. Описи співмірні за довжиною, 15px; умови права на безкоштовний візит залишилися під картками, 14px. Верхній і нижній повтор однакового заголовка та justify-between із зайвою порожнечею прибрані. Mobile stacking збережено.

Файли: src/components/booking/booking-flow.tsx, src/components/booking/types.ts, tests/int/booking-purpose.int.spec.tsx, цей звіт. Оплата, purpose enum, OTP, серверна eligibility, профілі та Payload schema не змінені; міграцій немає.

Клавіатурні кнопки, aria-pressed, focus ring та повна accessible name Follow-up appointment збережені. Опис пов'язаний через aria-describedby й унікальний useId для кожного екземпляра форми. Новий regression test перевіряє заголовки й збалансовану довжину copy; існуючі form/focus/privacy тести пройшли: 14 passed у 4 файлах.

Відкат — повернення цих UI/type/test файлів, без змін даних. SEO, canonical, sitemap, приватні noindex/no-store й кеш-інвалідація не змінені. Нових пакетів і логування немає.

Локальний Docker раніше пропущено за рішенням користувача. Full DB suite/build, нові desktop/mobile screenshots, axe та фізичний телефон цим кроком не перевірялися. Затверджений макет — не screenshot фактичного deployment. Перед випуском потрібна перевірка реального Preview на desktop/mobile, переносу заголовків, контрасту, keyboard focus і layout shift. Поточні зміни локальні, не commit/push/merge та не production deployment.
