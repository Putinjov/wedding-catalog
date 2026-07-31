# Wedding Catalog Backlog

Цей пакет містить 45 окремих задач, згрупованих за напрямами, та майстер-промпт для послідовної реалізації

## Рекомендований порядок PR

1. SEO emergency fixes
2. Dress status model
3. Shared availability filters
4. Catalogue mode and pagination
5. Catalogue filters and sorting
6. Dress detail UX
7. Booking settings and undecided intent
8. Hold expiry and cleanup
9. Email pipeline
10. Success and admin workflows
11. Accessibility
12. Image and caching performance
13. Monitoring and rate limiting
14. Final production audit

## Задачі

- [01. Fix canonical metadata](./01-fix-canonical-metadata/TASK.md) — **P0**, `seo`
- [02. Add dresses sitemap](./02-add-dresses-sitemap/TASK.md) — **P0**, `seo`
- [03. Add slug history and redirects](./03-add-slug-history-and-redirects/TASK.md) — **P0**, `routing`
- [04. Split sale and rental availability](./04-split-sale-and-rental-availability/TASK.md) — **P0**, `data-model`
- [05. Create shared public dress filters](./05-create-shared-public-dress-filters/TASK.md) — **P0**, `domain`
- [06. Add CMS business validation](./06-add-cms-business-validation/TASK.md) — **P0**, `cms`
- [07. Extend dress attributes](./07-extend-dress-attributes/TASK.md) — **P1**, `cms`
- [08. Preserve catalogue mode in dress links](./08-preserve-catalogue-mode-in-dress-links/TASK.md) — **P0**, `catalogue`
- [09. Add server-side catalogue pagination](./09-add-server-side-catalogue-pagination/TASK.md) — **P0**, `catalogue`
- [10. Add catalogue sorting](./10-add-catalogue-sorting/TASK.md) — **P1**, `catalogue`
- [11. Add catalogue filters](./11-add-catalogue-filters/TASK.md) — **P1**, `catalogue`
- [12. Improve dress cards](./12-improve-dress-cards/TASK.md) — **P1**, `catalogue`
- [13. Upgrade dress gallery](./13-upgrade-dress-gallery/TASK.md) — **P1**, `dress-detail`
- [14. Clean up dress detail content](./14-clean-up-dress-detail-content/TASK.md) — **P1**, `dress-detail`
- [15. Add breadcrumbs and return navigation](./15-add-breadcrumbs-and-return-navigation/TASK.md) — **P0**, `navigation`
- [16. Improve related dress ranking](./16-improve-related-dress-ranking/TASK.md) — **P1**, `recommendations`
- [17. Create Booking Settings global](./17-create-booking-settings-global/TASK.md) — **P0**, `booking`
- [18. Add undecided booking intent](./18-add-undecided-booking-intent/TASK.md) — **P0**, `booking`
- [19. Add minimum notice and cutoff rules](./19-add-minimum-notice-and-cutoff-rules/TASK.md) — **P0**, `booking`
- [20. Add privacy and consent handling](./20-add-privacy-and-consent-handling/TASK.md) — **P0**, `privacy`
- [21. Unify booking hold and Stripe expiry](./21-unify-booking-hold-and-stripe-expiry/TASK.md) — **P0**, `payments`
- [22. Clean up expired holds](./22-clean-up-expired-holds/TASK.md) — **P0**, `payments`
- [23. Implement paid conflict workflow](./23-implement-paid-conflict-workflow/TASK.md) — **P0**, `payments`
- [24. Add email queue and idempotency](./24-add-email-queue-and-idempotency/TASK.md) — **P0**, `notifications`
- [25. Improve booking success page](./25-improve-booking-success-page/TASK.md) — **P0**, `booking`
- [26. Expand appointment admin drawer](./26-expand-appointment-admin-drawer/TASK.md) — **P1**, `admin`
- [27. Formalize appointment lifecycle](./27-formalize-appointment-lifecycle/TASK.md) — **P0**, `domain`
- [28. Add booking focus management](./28-add-booking-focus-management/TASK.md) — **P0**, `accessibility`
- [29. Improve form semantics and autofill](./29-improve-form-semantics-and-autofill/TASK.md) — **P0**, `accessibility`
- [30. Improve mobile booking presentation](./30-improve-mobile-booking-presentation/TASK.md) — **P0**, `mobile`
- [31. Run accessibility test suite](./31-run-accessibility-test-suite/TASK.md) — **P1**, `accessibility`
- [32. Add Product JSON-LD](./32-add-product-json-ld/TASK.md) — **P0**, `seo`
- [33. Add LocalBusiness structured data](./33-add-localbusiness-structured-data/TASK.md) — **P1**, `seo`
- [34. Define filter and pagination indexation](./34-define-filter-and-pagination-indexation/TASK.md) — **P1**, `seo`
- [35. Make ImageMedia server-compatible](./35-make-imagemedia-server-compatible/TASK.md) — **P0**, `performance`
- [36. Fix image quality and sizes](./36-fix-image-quality-and-sizes/TASK.md) — **P0**, `performance`
- [37. Add catalogue caching and invalidation](./37-add-catalogue-caching-and-invalidation/TASK.md) — **P0**, `performance`
- [38. Add dress and related caching](./38-add-dress-and-related-caching/TASK.md) — **P1**, `performance`
- [39. Optimize Payload dress queries](./39-optimize-payload-dress-queries/TASK.md) — **P0**, `performance`
- [40. Optimize hero video](./40-optimize-hero-video/TASK.md) — **P0**, `performance`
- [41. Add shared production rate limiting](./41-add-shared-production-rate-limiting/TASK.md) — **P0**, `operations`
- [42. Add production error monitoring](./42-add-production-error-monitoring/TASK.md) — **P0**, `operations`
- [43. Verify and harden production cron jobs](./43-verify-and-harden-production-cron-jobs/TASK.md) — **P0**, `operations`
- [44. Add and verify database indexes](./44-add-and-verify-database-indexes/TASK.md) — **P0**, `database`
- [45. Expand production smoke suite](./45-expand-production-smoke-suite/TASK.md) — **P0**, `testing`