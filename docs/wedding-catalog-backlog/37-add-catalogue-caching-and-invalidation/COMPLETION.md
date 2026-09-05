# Task 37 — Add catalogue caching and invalidation

Статус: локальна валідація завершена 2026-09-05. Гілка: `codex/catalogue-caching`, база: `d125365`. Task 38 ще не реалізовано. Commit, push, PR і deployment для цих змін ще не виконані.

## Проблема та результат

Повторні запити `/buy` і `/rent` раніше щоразу завантажували сукні та п'ять довідників із Payload. Додано persistent Next Data Cache для нормалізованих catalogue queries та публічних filter options із фоновим оновленням за часом через 300 секунд.

Ключ результатів містить лише mode, нормалізовані relationship IDs/featured, sort і page. Labels, сирі query strings, tracking та невідомі параметри у ключ не потрапляють. Relationship conditions повторно використовують `buildCatalogueFilterConditions`, включно зі стабільним порядком та усуненням дублікатів.

Довільні price ranges і сторінки понад 100 виконуються без persistent cache. Це межа допуску до кешу, а не обмеження ціни чи навігації. Допустимі relationship combinations визначаються публічними CMS options; sort і mode мають скінченні доменні значення.

Draft Mode обходить persistent cache суконь та options. Публічні catalogue queries зберігають `overrideAccess: false`, фільтр published/public/available та явно використовують `draft: false`. Приватні draft records не додаються до каталогу.

## Файли

- `src/lib/getDresses.ts` — кешування результатів і правила допуску до кешу.
- `src/lib/getCatalogueFilterOptions.ts` — кешування п'яти публічних довідників.
- `src/lib/dress-cache.ts` — спільні cache tags і негайна інвалідація.
- `src/components/boutique/catalogue-page.tsx` — передача Draft Mode у data loaders.
- `src/collections/Dresses/hooks/revalidateDress.ts` — інвалідація після публічних змін, зняття з публікації та видалення.
- `src/collections/hooks/revalidateCatalogue.ts` — hooks довідників і фотографій із підтримкою `disableRevalidate`.
- `src/collections/Categories.ts` — підключення hooks.
- `src/collections/Lookups/createLookupCollection.ts` — явна опція `invalidatesCatalogue`.
- `src/collections/Lookups/Colors.ts`, `Designers.ts`, `Fabrics.ts`, `Silhouettes.ts` — увімкнення hooks для catalogue filters.
- `src/collections/Media.ts` — інвалідація кешованих фотографій після update/delete.
- `tests/int/catalogue-caching.int.spec.ts` — нові перевірки ключів, cache hits, bypass і refresh після інвалідації.
- `tests/int/catalogue-filter-options.int.spec.ts`, `dress-availability.int.spec.ts`, `public-dress-filters.int.spec.ts` — адаптація старих query tests до Next cache wrapper.
- `tests/int/dresses-sitemap.int.spec.ts` — окремий підрахунок sitemap tag після додавання catalogue tags.
- Цей completion report.

## Міграція та rollback

Schema, індекси й формат документів не змінені; data migration та Production migration gate не потрібні. Generated types/import map не змінилися.

Rollback: відкотити лише commit Task 37 та повторно розгорнути застосунок. Попередня реалізація читає Payload без цього кешу, тому міграція або перетворення даних для rollback не потрібні. Після виправленого повторного ввімкнення кешування очистити Next Data Cache або змінити версію ключа, якщо семантика query змінилася.

## Тести

- `npm ci` — пройшов у попередньому проході цієї задачі; lockfile не змінювався.
- `npm run generate:types` — пройшов після фінальних hooks.
- `npm run generate:importmap` — пройшов, нових imports немає.
- `git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"` — пройшов.
- `npm run lint` — 0 errors; наявна warning про невикористаний `dirname` у `Media.ts` збережена.
- Фінальний `npm run test:int` — **70/70 файлів, 540/540 тестів**.
- `npm run build` — compilation, TypeScript, page-data collection та generation пройшли.
- `DEVICE_TEST_BASE_URL=http://localhost:3000 npm run test:e2e -- tests/e2e/catalogue.e2e.spec.ts --workers=1 --reporter=line --output=test-results/task-37-e2e` — **2/2 тести** проти локального production build.
- `git diff --check` — пройшов; Git попереджає про наявну Windows LF/CRLF-конфігурацію.

Перший повний suite під паралельним навантаженням мав один timeout існуючого health-check (503 замість 200, ліміт 2500 ms). Ізольований повтор — 4/4; фінальний повний повтор — 540/540. Health-check та його timeout не змінювалися.

Локальний build потребував process-only SMTP placeholders та preview/cron placeholders достатньої довжини, аналогічно CI. Файли `.env` і налаштування провайдерів не змінювалися. SMTP adapter має `skipVerify: true`; email не надсилалися. Перед build через Payload Local API з вимкненим `onInit` перевірено, що існуючий legacy-role hook не потребує жодних записів.

## Ручна та runtime-перевірка

Chromium, локальний `next start`, desktop 1440×900 і mobile 390×844:

1. `/buy` та `/rent` повертають 200 і відображають catalogue cards; перевірено вигляд знімків.
2. Mobile filter drawer відкривається Enter, закривається кнопкою Close та повертає фокус на Filters; горизонтального overflow немає.
3. Публічних size checkboxes і SKU у customer UI немає.
4. Canonical лишається `https://caitbridal.ie/buy` або `/rent`.
5. `priceMax=0` зберігає `noindex, follow` і clean canonical; persistent query entry не створюється.
6. Три повторні запити з різними `utm_source` використовують ті самі catalogue cache files: склад і modification timestamps не змінюються.
7. Buy, Rent і filter options мають окремі tagged persistent entries.
8. `page=101`, некоректний sort і невідомий designer нормалізуються redirect без додаткових catalogue cache entries.
9. Browser `pageerror` відсутні; існуючий desktop E2E також перевірив відсутність console errors.

Локальні screenshots: `test-results/task-37-desktop-buy.png`, `task-37-desktop-rent.png`, `task-37-mobile-buy.png`, `task-37-mobile-rent.png`. Вони є артефактами перевірки в ignored directory; візуальний UI цією задачею не змінювався.

## Security/privacy

У кеш потрапляють лише результати публічних catalogue queries. Booking/payment loaders, приватні URL, consent, Stripe та email queue не змінені. Нових логів із customer data чи secrets немає. Production records для перевірки інвалідації не редагувалися: сценарії sold/cleaning/hidden/draft/delete та media changes перевірені інтеграційними тестами.

## Accessibility

Семантика та стилі UI не змінювалися. Keyboard flow, focus return, touch target Close у наявному E2E, reduced motion і mobile overflow перевірені. Новий повний axe audit не виконувався, оскільки Task 37 змінює data caching.

## SEO/cache

Використовуються tags `dresses`, `dresses:catalogue:buy`, `dresses:catalogue:rent` та `catalogue-filter-options`.

Payload hooks негайно інвалідують catalogue entries через `revalidateTag(tag, { expire: 0 })`. Це не дозволяє наступному запиту отримати старий результат через stale-while-revalidate після зміни visibility або availability. Поведінку API звірено з [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).

Зміни labels/slug/active-state у catalogue lookup collections очищають також filter options. Media hooks очищають кешовані картки після зміни фотографій. Existing sitemap invalidation збережено. Canonical, robots policy та JSON-LD не змінені.

## Залишкові ризики та наступний крок

- Vercel Preview перевірка та реальний save/unpublish/delete через Payload Admin на ізольованих тестових даних залишаються deployment verification для об'єднаного PR Tasks 37–38.
- Hook invalidation у Vitest перевіряється через cache test double; runtime cache reuse додатково перевірено на справжньому локальному Next Data Cache.
- Invalidation є широкою: публічна зміна сукні або media очищає обидва catalogue modes. Це може збільшувати кількість cache misses після редагування.
- Price-filtered queries, сторінки понад 100 та Draft Mode навмисно не мають persistent query cache.
- Виклики Payload поза Next runtime, які вже використовують `disableRevalidate`, мають очищати відповідні tags після завершення batch-операції; fallback revalidation за часом становить 300 секунд і використовує stale-while-revalidate.

Точна наступна задача: **Task 38 — Add dress and related caching**, у цій самій гілці для погодженого спільного focused PR Tasks 37–38. Task 37 має залишитися окремим commit.
