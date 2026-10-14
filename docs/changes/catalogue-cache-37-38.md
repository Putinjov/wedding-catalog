# Tasks 37–38 — кешування каталогу, суконь і рекомендацій

## Межі та залежності

Погоджений об’єднаний PR для двох залежних performance-задач. База: master 186d3b4 після PR #56. Task 37 перенесено окремим commit 487c6c3; Task 38 повторно використовує його tags і hooks. Зміни Manager, Terms, футера, графіка та окремий booking focus-fix не включено.

## Проблема й реалізація

Публічні запити повторно виконували Payload queries між HTTP requests. Додано Next Data Cache для catalogue queries, filter options, detail за slug та related results за source dress/mode/ranking attributes. React request memoization для metadata/page збережено.

- Buy/Rent мають окремі keys/tags; raw query, tracking і returnTo не входять у keys.
- Relationship filters перетворюються на відомі CMS IDs у стабільному порядку.
- Вільні price ranges, сторінки понад 100 і Draft Mode обходять persistent cache; навігація не обмежується.
- Published/public queries зберігають overrideAccess: false; Draft Mode не відкриває приватні записи.
- Null/hidden detail не записується в persistent cache. Помилки бази не перетворюються на 404.
- Hooks суконь/медіа/довідників негайно очищають спільний кеш; rename також очищає old/new slug tags і populated redirects.
- Серверна booking-перевірка використовує uncached readers у всіх трьох purposes. Оплата, consent і availability rules не змінюються.

## Файли

- Loaders: src/lib/getDresses.ts, getCatalogueFilterOptions.ts, getDress.ts.
- Tags: src/lib/dress-cache.ts.
- Public query context: src/components/boutique/catalogue-page.tsx.
- Booking freshness: src/lib/booking/createAppointment.ts.
- Hooks: src/collections/hooks/revalidateCatalogue.ts, src/collections/Dresses/hooks/revalidateDress.ts.
- Підключення hooks: Categories.ts, Media.ts, Lookups/createLookupCollection.ts; Colors, Designers, Fabrics, Silhouettes, Backs, Embellishments, Necklines, Sleeves, Trains, Waistlines.
- Тести: catalogue-caching, dress-caching, catalogue-filter-options, dress-availability, dresses-sitemap, public-dress-filters, booking-dress-availability.
- Цей звіт і completion reports Tasks 37–38.

## Міграція та rollback

Schema/data migration, індекси, нові залежності й Production migration gate не потрібні. Generated artifacts не мають змістового diff.

Rollback: revert обидва caching commits і redeploy. Це поверне прямі Payload reads без зміни даних. Перед повторним увімкненням із новою query-семантикою очистити відповідний Next Data Cache або змінити версію cache keys.

## Перевірки

Базовий незмінений master: npm ci, lint, TypeScript, 579/579 tests у 77 файлах — пройшли. Наявні diagnostics: unused dirname у Media.ts; vite-tsconfig-paths повідомляє про apps/manager/tsconfig.json, оскільки кореневий npm ci не встановлює окремий Expo-проєкт. Обидві diagnostics присутні до кешування; baseline exit code 0.

Task 37: focused suite 38/38 і TypeScript пройшли. Об’єднаний caching/freshness suite: 37/37. Generate types/importmap і generated-file diff пройшли.

Фінальний full suite пройшов: 614/614 tests у 79 файлах. `npm run lint`, `npm run build` та `npx tsc --noEmit --incremental false` пройшли. `npm run generate:types`, `npm run generate:importmap` і `git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"` підтвердили відсутність змістових змін generated artifacts. Build не запускав міграції; перед ним read-only preflight перевірив, що ініціалізація Payload не потребує legacy user role writes.

Локальний production build перевірено на 1440×900 і 390×844: `/buy` та `/rent` повертають 200, catalogue/detail не мають горизонтального переповнення, публічних size controls або SKU. Для обох modes підтверджено чисті canonical, заголовок і Product JSON-LD, robots/sitemap policy, HTTP 404/noindex для відсутнього slug, keyboard flow мобільних фільтрів та нуль порушень у full-page axe. Повторні tracking/returnTo requests не створили нових persistent entries; Draft Mode оминає persistent cache. Використано наявні публічні записи лише для читання. Нові booking або email не створювалися. Локальні screenshots лежать у ignored `test-results/`; UI у цьому PR не змінюється.

## Manual verification / Preview checklist

1. Перевірити /buy і /rent на desktop/mobile, filters keyboard flow та відсутність size filters/SKU.
2. Повторити запити з різними tracking/returnTo; переконатися, що cache entries не множаться.
3. Перевірити detail/related для обох modes, canonical, Product JSON-LD і HTTP 404/noindex для відсутніх slug.
4. Перевірити Draft Mode без запису в persistent cache.
5. На окремій тестовій базі змінити public dress: title, sold, rental availability, rename, hidden, draft, delete. Наступний запит має отримати свіжий результат; old slug redirect має вести на актуальний slug.
6. Перевірити інвалідацію після media та lookup update/delete.

Production-записи для перевірки інвалідації не редагувати. Hook mutation scenarios у suite використовують test doubles.

## Security/privacy

Кешуються лише публічні catalogue queries. Customer PII, booking/payment URL, SMTP, Stripe, consent та private no-store routes не змінені. Нових логів із секретами або даними клієнта немає.

## Accessibility

Візуальні компоненти й booking dialog не змінені. Перевірка layout/axe/filters не є аудитом screen readers або фізичних мобільних пристроїв.

Відоме окреме незмерджене виправлення: rental dialog повертає focus на інший trigger. Воно описане в локальному FOCUS-RETURN-FOLLOWUP.md і навмисно не включене до caching PR.

## SEO/cache та залишкові ризики

Canonical, robots, sitemap та Product JSON-LD policy збережені. Sitemap hooks продовжують працювати.

Широка інвалідація збільшує cache misses після CMS edits. TTL 300 секунд використовує stale-while-revalidate, а не жорстку межу свіжості. Batch-операції з disableRevalidate повинні явно очистити tags після завершення: без цього попередній successful detail може зберігатися навіть при невдалому background refresh. Booking не довіряє цій копії.

Реальні save/rename/unpublish/delete на ізольованій Preview базі залишаються перевіркою перед merge. Без погоджених тестових записів production не змінюємо.

Точний наступний крок: Vercel Preview verification об’єднаного PR Tasks 37–38. Task 39 не розпочато.
