# Task 38 — Add dress and related caching

Реалізацію перенесено на master 186d3b4 у гілку codex/catalogue-cache-37-38 після перевірки Task 37. Спільні tags і hooks Task 37 присутні окремим commit 487c6c3; обидві задачі подаються в одному погодженому PR.

Актуальний звіт, перелік файлів, validation, rollback, privacy/accessibility/SEO та Preview checklist: [Tasks 37–38](../../changes/catalogue-cache-37-38.md).

Деталі: React request memoization збережено; persistent cache за slug і related source/mode; old/new slug invalidation; missing/hidden results не persist-яться; backend booking перевіряє актуальний Payload без кешу.

Міграція даних не потрібна. До завершення Preview verification задача не позначається production-validated. Task 39 не розпочато.
