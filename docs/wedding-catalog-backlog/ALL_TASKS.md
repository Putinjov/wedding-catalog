# Complete backlog

## 01. Fix canonical metadata

**Priority:** P0  
**Area:** `seo`

### Scope
- Remove `alternates.canonical: '/'` from the root frontend layout.
- Add self-canonical metadata for `/`, `/buy`, `/rent`, and `/book-a-fitting`.
- Add canonical `/dresses/[slug]` for dress detail pages, excluding `mode` and tracking query parameters.
- Prevent the site name from being appended twice in dress page titles.
- Add `noindex, nofollow` metadata to customer-specific pending/payment pages.

### Acceptance criteria
- [ ] `/buy` canonical resolves to `/buy`.
- [ ] `/rent` canonical resolves to `/rent`.
- [ ] `/dresses/example?mode=rent` canonical resolves to `/dresses/example`.
- [ ] No title contains `CAIT Bridal` twice.
- [ ] Pending and payment URLs expose both metadata and HTTP noindex protection.

## 02. Add dresses sitemap

**Priority:** P0  
**Area:** `seo`

### Scope
- Create `/dresses-sitemap.xml`.
- Add the dresses sitemap to `/sitemap.xml`.
- Add real static routes such as `/buy`, `/rent`, and `/book-a-fitting` to the appropriate sitemap.
- Remove `/search` from the sitemap unless an explicit indexation policy says otherwise.
- Add cache tags and Payload revalidation hooks for sitemap updates.

### Acceptance criteria
- [ ] Only published and publicly visible dresses are listed.
- [ ] Draft, hidden, and invalid-slug dresses are excluded.
- [ ] `lastmod` uses `updatedAt`.
- [ ] All listed URLs return HTTP 200.
- [ ] Publish, unpublish, and visibility changes invalidate the sitemap cache.

## 03. Add slug history and redirects

**Priority:** P0  
**Area:** `routing`

### Scope
- Prevent accidental slug changes after publication or require an explicit confirmation flow.
- Store previous slugs for each dress.
- Create permanent redirects from old slugs to the current slug.
- Preserve a valid `mode` query parameter through redirects.
- Add a custom storefront 404 page.

### Acceptance criteria
- [ ] An old slug returns a permanent redirect to the current dress URL.
- [ ] Hidden dresses remain unavailable.
- [ ] Sold dresses follow the agreed public visibility policy.
- [ ] Invalid redirect targets cannot create open redirects.

## 04. Split sale and rental availability

**Priority:** P0  
**Area:** `data-model`

### Scope
- Replace the single availability state with separate `saleStatus`, `rentalStatus`, and `publicVisibility` fields.
- Define migration rules for existing records.
- Update generated Payload types.
- Update admin labels and help text.

### Acceptance criteria
- [ ] Sold dresses can remain public while disappearing from the Buy catalogue.
- [ ] A rented dress may remain available for sale.
- [ ] Cleaning and repair states block rental availability.
- [ ] Hidden and archived dresses are excluded from all public surfaces.

## 05. Create shared public dress filters

**Priority:** P0  
**Area:** `domain`

### Scope
- Create one reusable builder for public dress query conditions.
- Use it in Buy catalogue, Rent catalogue, related dresses, booking validation, sitemap, and search.
- Represent mode-specific status requirements explicitly.
- Add unit tests for all status combinations.

### Acceptance criteria
- [ ] No public query duplicates its own availability logic.
- [ ] Booking backend revalidates the selected dress against current public rules.
- [ ] Unavailable dresses never appear in related results.
- [ ] All tests cover sale, rental, sold, rented, cleaning, repair, hidden, and archived states.

## 06. Add CMS business validation

**Priority:** P0  
**Area:** `cms`

### Scope
- Require a sale price or explicit price-on-request state when a dress is for sale.
- Require rental price when rental is enabled.
- Validate security deposit according to business policy.
- Require `previousSalePrice > salePrice`.
- Require or auto-generate gallery alt text.
- Reject invalid status combinations and duplicate slugs.

### Acceptance criteria
- [ ] Invalid records cannot be published.
- [ ] Validation errors are clear to admin users.
- [ ] Existing valid content survives migration.
- [ ] Generated types and integration tests pass.

## 07. Extend dress attributes

**Priority:** P1  
**Area:** `cms`

### Scope
- Add neckline, sleeves, train, back, waistline, embellishments, fit notes, alteration possibilities, alteration limitations, included accessories, and optional accessories.
- Expose fields in the storefront where useful.
- Do not add customer-facing size filters or public size logic.

### Acceptance criteria
- [ ] Attributes are optional unless business rules require them.
- [ ] Public copy includes individual fitting and professional alteration messaging.
- [ ] Fields are usable in future filters and related ranking.

## 08. Preserve catalogue mode in dress links

**Priority:** P0  
**Area:** `catalogue`

### Scope
- From Buy catalogue link to `/dresses/[slug]?mode=buy`.
- From Rent catalogue link to `/dresses/[slug]?mode=rent`.
- Apply the same behavior to related dress cards.
- Keep canonical URLs mode-neutral.

### Acceptance criteria
- [ ] Buy cards open the buy state.
- [ ] Rent cards open the rent state.
- [ ] Related cards retain the current mode.
- [ ] Canonical metadata excludes mode.

## 09. Add server-side catalogue pagination

**Priority:** P0  
**Area:** `catalogue`

### Scope
- Read page from URL query parameters.
- Use Payload pagination rather than a hardcoded first 24 records.
- Show result count and previous/next controls.
- Handle invalid or out-of-range pages.
- Preserve filter, sort, and scroll state.

### Acceptance criteria
- [ ] Every published matching dress is reachable.
- [ ] Pagination works without client-only filtering.
- [ ] Page state is shareable via URL.
- [ ] Navigation is keyboard accessible.

## 10. Add catalogue sorting

**Priority:** P1  
**Area:** `catalogue`

### Scope
- Support Featured, Curated order, Newest, Price low-to-high, and Price high-to-low.
- Add `featured` and `displayOrder` CMS fields.
- Use separate sale and rental prices depending on mode.
- Normalize invalid sort values.

### Acceptance criteria
- [ ] Sort state is represented in the URL.
- [ ] Sorting is deterministic with a stable secondary sort.
- [ ] Buy uses sale price and Rent uses rental price.
- [ ] Invalid sort values fall back safely.

## 11. Add catalogue filters

**Priority:** P1  
**Area:** `catalogue`

### Scope
- Add silhouette, designer, category, fabric, colour, price, and featured filters.
- Later support neckline, sleeves, train, and embellishments.
- Implement desktop filter UI and a mobile drawer.
- Add active filter chips, clear-all, and result count.
- Do not add size filters.

### Acceptance criteria
- [ ] Filters are server-backed and URL-driven.
- [ ] Multiple filters combine correctly.
- [ ] Empty states are customer-facing.
- [ ] Filtered pages follow the SEO noindex policy.

## 12. Improve dress cards

**Priority:** P1  
**Area:** `catalogue`

### Scope
- Show designer, silhouette, status badge, featured/new badge, and previous price when relevant.
- Emphasize sale price in Buy mode and rental price in Rent mode.
- Use wording such as `Rent from €X`.
- Use a clear CTA such as `View dress`.
- Handle sold dresses with a Sold badge and similar-dresses CTA.

### Acceptance criteria
- [ ] Card content changes appropriately by mode.
- [ ] No card exposes internal SKU.
- [ ] Unavailable cards cannot trigger invalid purchase or rental actions.
- [ ] Card links remain fully keyboard accessible.

## 13. Upgrade dress gallery

**Priority:** P1  
**Area:** `dress-detail`

### Scope
- Add lightbox, zoom, swipe, keyboard arrows, Escape close, focus trap, and accessible controls.
- Support product video already stored in CMS.
- Use responsive thumbnails and prioritize only the main image.
- Respect reduced-motion preferences.

### Acceptance criteria
- [ ] Full-size images are not all eagerly downloaded.
- [ ] Gallery works with keyboard only.
- [ ] Mobile swipe does not block vertical scrolling.
- [ ] Video has accessible controls or appropriate autoplay restrictions.

## 14. Clean up dress detail content

**Priority:** P1  
**Area:** `dress-detail`

### Scope
- Hide SKU from customer UI.
- Remove duplicate rental information.
- Show individual fitting and alteration trust copy.
- Separate sale and rental terms clearly.
- Add sold and unavailable states.
- Add sticky desktop summary and mobile booking CTA.

### Acceptance criteria
- [ ] Content reflects the active mode.
- [ ] Sold and unavailable states have no misleading CTA.
- [ ] Sticky UI does not cover content or conflict with modal overlays.
- [ ] Safe-area insets are handled on mobile.

## 15. Add breadcrumbs and return navigation

**Priority:** P0  
**Area:** `navigation`

### Scope
- Add visual breadcrumbs to dress pages.
- Add BreadcrumbList JSON-LD.
- Make breadcrumbs mode-aware for Buy and Rent.
- Add Back to catalogue with filter/page restoration.
- Validate any `returnTo` parameter.

### Acceptance criteria
- [ ] Breadcrumbs are visible and keyboard accessible.
- [ ] Structured data uses canonical URLs.
- [ ] Back navigation restores catalogue context.
- [ ] No open redirect is possible.

## 16. Improve related dress ranking

**Priority:** P1  
**Area:** `recommendations`

### Scope
- Rank by same category plus silhouette, then silhouette, designer, similar price, and featured fallback.
- Reuse shared public availability filters.
- Cache related results.
- Track related-card clicks.

### Acceptance criteria
- [ ] Unavailable dresses never appear.
- [ ] Current dress is excluded.
- [ ] Mode is preserved in links.
- [ ] Ranking is deterministic and tested.

## 17. Create Booking Settings global

**Priority:** P0  
**Area:** `booking`

### Scope
- Move duration, hold duration, booking horizon, minimum notice, cutoff, weekday hours, Saturday hours, lunch breaks, buffers, holidays, closures, blocked intervals, and timezone into a Payload Global.
- Use the same resolved settings in frontend and backend.
- Add safe defaults and validation.

### Acceptance criteria
- [ ] Settings changes do not require deploy.
- [ ] Backend remains authoritative.
- [ ] Europe/Dublin timezone is used consistently.
- [ ] Invalid settings cannot be saved.

## 18. Add undecided booking intent

**Priority:** P0  
**Area:** `booking`

### Scope
- Add `undecided` alongside buy and rent.
- Expose customer copy such as `I’m not sure yet`.
- Update validation, appointment records, admin UI, summaries, and emails.

### Acceptance criteria
- [ ] Undecided bookings can be completed and paid.
- [ ] Selected dress may still be recorded.
- [ ] Admin workflows display the state clearly.
- [ ] No code assumes only buy or rent.

## 19. Add minimum notice and cutoff rules

**Priority:** P0  
**Area:** `booking`

### Scope
- Add configurable minimum notice.
- Add configurable next-day cutoff.
- Support admin override separately.
- Apply rules in slot generation and final server validation.
- Add DST and timezone tests.

### Acceptance criteria
- [ ] Direct API submissions cannot bypass rules.
- [ ] UI and backend agree.
- [ ] Boundary times are tested in Europe/Dublin.
- [ ] Closed and blocked dates remain enforced.

## 20. Add privacy and consent handling

**Priority:** P0  
**Area:** `privacy`

### Scope
- Show a privacy notice on customer details.
- Link to the privacy policy.
- Store consent timestamp and policy version where legally required.
- Keep marketing consent separate and optional.
- Document retention and deletion behavior.

### Acceptance criteria
- [ ] Booking consent is not bundled with marketing.
- [ ] Required consent is enforced server-side.
- [ ] PII is not exposed in logs or Stripe metadata.
- [ ] Privacy copy is reviewable in CMS or configuration.

## 21. Unify booking hold and Stripe expiry

**Priority:** P0  
**Area:** `payments`

### Scope
- Use one shared hold duration.
- Set Stripe Checkout expiry to match the appointment slot hold.
- Add a countdown to pending/payment UI.
- Prevent expired sessions from silently confirming an invalid slot.
- Define conflict behavior for late payment events.

### Acceptance criteria
- [ ] Displayed countdown matches server expiry.
- [ ] Expired slots become available again.
- [ ] Stripe and appointment states cannot drift silently.
- [ ] Tests cover expiry boundaries.

## 22. Clean up expired holds

**Priority:** P0  
**Area:** `payments`

### Scope
- Create an authenticated cron job for expired pending appointments.
- Release slot locks and mark appointments expired.
- Skip paid and actively processing appointments.
- Process bounded batches with idempotency.
- Add structured logs and failure alerts.

### Acceptance criteria
- [ ] Rerunning the job is safe.
- [ ] No paid appointment is expired.
- [ ] Released slots become bookable.
- [ ] Failures are visible to operations.

## 23. Implement paid conflict workflow

**Priority:** P0  
**Area:** `payments`

### Scope
- Add `payment_received_conflict` state.
- Detect successful payment when confirmation cannot safely complete.
- Create admin actions to contact, reschedule, refund, and resolve.
- Send an internal alert.
- Keep an audit trail.

### Acceptance criteria
- [ ] No successful payment is left in an ambiguous silent state.
- [ ] Admin can resolve every conflict.
- [ ] Customer communications avoid exposing internal errors.
- [ ] Resolution is idempotent.

## 24. Add email queue and idempotency

**Priority:** P0  
**Area:** `notifications`

### Scope
- Queue pending, confirmed, failed, expired, rescheduled, cancelled, refund, and admin-alert emails.
- Add retries and idempotency keys.
- Add resend action in admin.
- Use privacy-safe templates and logs.
- Keep email sending outside critical webhook transactions.

### Acceptance criteria
- [ ] Duplicate webhooks do not duplicate email.
- [ ] Transient failures retry.
- [ ] Permanent failures are visible.
- [ ] No phone, notes, or full email body is logged.

## 25. Improve booking success page

**Priority:** P0  
**Area:** `booking`

### Scope
- Poll while payment status is processing.
- Show appointment date, time, purpose, selected dress, and reference.
- Show address, map link, arrival instructions, what to bring, email confirmation note, contact details, and Add to Calendar.
- Handle success, processing, expired, conflict, and failure states.

### Acceptance criteria
- [ ] Refresh does not break the page.
- [ ] Processing resolves without manual reload.
- [ ] Calendar export uses correct timezone.
- [ ] Private data remains noindex and no-store.

## 26. Expand appointment admin drawer

**Priority:** P1  
**Area:** `admin`

### Scope
- Add contact actions, reschedule, cancel, refund, resend confirmation, notes, status history, payment history, conflict resolution, and audit trail.
- Support undecided intent.
- Restrict actions by current state and permission.

### Acceptance criteria
- [ ] Invalid transitions are blocked.
- [ ] All mutations are auditable.
- [ ] Refund and reschedule actions are idempotent.
- [ ] Sensitive provider secrets are never shown.

## 27. Formalize appointment lifecycle

**Priority:** P0  
**Area:** `domain`

### Scope
- Define appointment states: pending_payment, payment_processing, confirmed, expired, cancelled, completed, no_show, payment_failed, payment_received_conflict, refunded, and partially_refunded.
- Define separate payment states: unpaid, processing, paid, failed, refunded, and partially_refunded.
- Create transition guards and migration rules.

### Acceptance criteria
- [ ] Appointment and payment state are never conflated.
- [ ] Every transition is tested.
- [ ] Admin and webhook paths share transition logic.
- [ ] Legacy records migrate safely.

## 28. Add booking focus management

**Priority:** P0  
**Area:** `accessibility`

### Scope
- Focus the heading after each booking step change.
- Focus the first invalid field after validation failure.
- Unify local and server field errors.
- Add `aria-current=step`, `aria-busy`, and live announcements.
- Ensure visual and DOM button order match.

### Acceptance criteria
- [ ] Keyboard-only users understand every transition.
- [ ] Screen readers announce errors and new steps.
- [ ] Server errors return focus to the correct step.
- [ ] No focus is lost inside modal or sheet presentation.

## 29. Improve form semantics and autofill

**Priority:** P0  
**Area:** `accessibility`

### Scope
- Add autocomplete attributes for name, email, and phone.
- Add required semantics and inputMode where appropriate.
- Explain required versus optional fields.
- Add notes character count.
- Use accessible descriptions for validation.

### Acceptance criteria
- [ ] Mobile autofill works.
- [ ] Screen readers identify required fields.
- [ ] Character count updates accessibly.
- [ ] Client and server errors share the same presentation.

## 30. Improve mobile booking presentation

**Priority:** P0  
**Area:** `mobile`

### Scope
- Use a full-screen sheet or dedicated page for mobile booking.
- Avoid nested scroll containers.
- Add safe-area padding.
- Keep primary action reachable without covering fields.
- Ensure the on-screen keyboard does not hide controls.

### Acceptance criteria
- [ ] Booking is usable on common iPhone and Android viewport sizes.
- [ ] Focus trap and Escape/back behavior are correct.
- [ ] Sticky actions do not overlap content.
- [ ] Desktop dialog behavior remains intact.

## 31. Run accessibility test suite

**Priority:** P1  
**Area:** `accessibility`

### Scope
- Add axe checks.
- Add Playwright keyboard-only booking tests.
- Check contrast, 200% zoom, reduced motion, VoiceOver, and TalkBack.
- Document manual smoke-test results.

### Acceptance criteria
- [ ] No critical axe violations.
- [ ] Booking completes keyboard-only.
- [ ] All touch targets meet minimum size.
- [ ] Reduced-motion users do not receive unnecessary autoplay animation.

## 32. Add Product JSON-LD

**Priority:** P0  
**Area:** `seo`

### Scope
- Add Product schema to dress pages.
- Include name, description, images, brand, SKU, canonical URL, and sale Offer when valid.
- Map availability accurately.
- Do not invent reviews or ratings.
- Do not represent a rental fee as a sale offer.

### Acceptance criteria
- [ ] Structured data validates.
- [ ] Sale prices and availability match visible content.
- [ ] Sold items use OutOfStock where appropriate.
- [ ] Rental-only dresses do not expose misleading sale offers.

## 33. Add LocalBusiness structured data

**Priority:** P1  
**Area:** `seo`

### Scope
- Add BridalShop or suitable LocalBusiness schema to the homepage.
- Include verified name, URL, logo, phone, email, address, opening hours, social profiles, and geo only when confirmed.

### Acceptance criteria
- [ ] All details match visible site content.
- [ ] No unverified address or coordinates are published.
- [ ] Schema validates without warnings that indicate missing known business data.

## 34. Define filter and pagination indexation

**Priority:** P1  
**Area:** `seo`

### Scope
- Set filtered catalogue URLs to `noindex, follow` with canonical to the base catalogue.
- Use self-canonical pagination.
- Keep search pages noindex.
- Allow dedicated editorial designer and silhouette landing pages to be indexable when they contain unique content.

### Acceptance criteria
- [ ] Query combinations do not create index bloat.
- [ ] Page 2 and deeper remain crawlable.
- [ ] Canonical tags match the documented policy.
- [ ] Metadata tests cover filter and pagination cases.

## 35. Make ImageMedia server-compatible

**Priority:** P0  
**Area:** `performance`

### Scope
- Remove `use client` from non-interactive ImageMedia.
- Keep interactive lightbox or carousel code in separate client components.
- Verify all usages remain compatible.

### Acceptance criteria
- [ ] Catalogue cards no longer hydrate an image wrapper.
- [ ] Build and type checks pass.
- [ ] No hydration warnings appear.
- [ ] Interactive galleries still function.

## 36. Fix image quality and sizes

**Priority:** P0  
**Area:** `performance`

### Scope
- Remove global `quality={100}`.
- Use sensible defaults such as 75 for cards and 85 for main gallery.
- Keep allowed qualities aligned with Next config.
- Require explicit `sizes` for fill images.

### Acceptance criteria
- [ ] Generated image requests use allowed quality values.
- [ ] Responsive images are not substantially oversized.
- [ ] Visual quality remains acceptable.
- [ ] Lighthouse image warnings are reduced.

## 37. Add catalogue caching and invalidation

**Priority:** P0  
**Area:** `performance`

### Scope
- Add persistent cache for catalogue queries.
- Normalize mode, filters, sort, and page into safe cache keys.
- Add tags for global dresses and mode catalogues.
- Invalidate from Payload hooks after relevant changes.

### Acceptance criteria
- [ ] Repeated catalogue requests avoid duplicate database work.
- [ ] Content updates appear after invalidation.
- [ ] Arbitrary query parameters cannot create unbounded cache keys.
- [ ] Preview and draft behavior remains correct.

## 38. Add dress and related caching

**Priority:** P1  
**Area:** `performance`

### Scope
- Keep React request memoization.
- Add persistent cache by slug for dress detail.
- Cache related dresses by dress and mode.
- Invalidate old and new slug tags after slug changes.

### Acceptance criteria
- [ ] Metadata and page rendering share cached data safely.
- [ ] Updated dresses appear promptly.
- [ ] Related results update after catalogue changes.
- [ ] 404 and hidden behavior is not incorrectly cached.

## 39. Optimize Payload dress queries

**Priority:** P0  
**Area:** `performance`

### Scope
- Use `select` for catalogue and related queries.
- Reduce relationship depth where possible.
- Fetch only fields needed by cards.
- Add pagination and inspect query plans.
- Add indexes only for actual public query patterns.

### Acceptance criteria
- [ ] RSC payload and database response size decrease.
- [ ] Card rendering retains all required data.
- [ ] Query performance is measured before and after.
- [ ] No unnecessary fields or nested media records are fetched.

## 40. Optimize hero video

**Priority:** P0  
**Area:** `performance`

### Scope
- Provide WebM and MP4 sources.
- Provide a poster image and mobile fallback.
- Use muted and playsInline.
- Respect reduced motion.
- Avoid eager downloading that blocks LCP.
- Serve through CDN with appropriate cache headers.

### Acceptance criteria
- [ ] Hero text and CTA render before video.
- [ ] Mobile can use poster-only mode.
- [ ] Video does not become a critical LCP blocker.
- [ ] File size stays within the agreed performance budget.

## 41. Add shared production rate limiting

**Priority:** P0  
**Area:** `operations`

### Scope
- Replace process-local limiting with Redis, KV, Cloudflare, or equivalent shared enforcement.
- Use separate policies for availability, appointment creation, and payment-related endpoints.
- Handle trusted proxy/IP extraction safely.
- Add email/phone abuse controls where appropriate.

### Acceptance criteria
- [ ] Limits remain consistent across serverless instances.
- [ ] Legitimate booking flows are not blocked.
- [ ] Abuse events are observable.
- [ ] Sensitive values are never logged.

## 42. Add production error monitoring

**Priority:** P0  
**Area:** `operations`

### Scope
- Integrate a centralized error-monitoring provider.
- Capture server, frontend booking, webhook, email, cron, R2, and database failures.
- Add PII redaction.
- Use correlation identifiers such as request ID, appointment reference, Stripe event ID, and job ID.

### Acceptance criteria
- [ ] Critical failures generate alerts.
- [ ] Logs contain no phone, notes, or full customer content.
- [ ] Webhook and cron failures can be traced end-to-end.
- [ ] Source maps work for production builds.

## 43. Verify and harden production cron jobs

**Priority:** P0  
**Area:** `operations`

### Scope
- Confirm deployment schedule, endpoint, secret validation, timeout, retries, and alerts.
- Make every job idempotent and bounded.
- Support manual rerun.
- Cover expired holds, stale locks, stale webhook claims, reminders, and retention jobs as applicable.

### Acceptance criteria
- [ ] A configured secret alone is not treated as proof the cron runs.
- [ ] Each job records success and failure metrics.
- [ ] Retries do not duplicate side effects.
- [ ] Manual execution is documented.

## 44. Add and verify database indexes

**Priority:** P0  
**Area:** `database`

### Scope
- Add indexes for dress slug, visibility/status fields, appointment slot key, appointment date/status, hold expiry, Stripe identifiers, webhook event ID, and cleanup timestamps.
- Add filter indexes only after confirming query patterns.
- Document index creation and rollback.

### Acceptance criteria
- [ ] Unique constraints protect slot and webhook idempotency.
- [ ] Production startup verifies required indexes.
- [ ] Queries avoid full scans on critical paths.
- [ ] Index changes are migration-safe.

## 45. Expand production smoke suite

**Priority:** P0  
**Area:** `testing`

### Scope
- Test `/buy`, `/rent`, dress detail, booking, Stripe replay, sitemap index, dresses sitemap, canonical metadata, JSON-LD, noindex headers, email, cron, and rollback.
- Update deployment documentation.
- Add Lighthouse or performance budget checks where stable.

### Acceptance criteria
- [ ] Clean checkout passes generate, lint, integration tests, and build.
- [ ] Critical production routes return expected status and headers.
- [ ] Stripe replay remains idempotent.
- [ ] Deployment checklist matches the final architecture.
