# Booking email verification and two-year repeat entitlement

## Problem

The current welcome offer confirms every online fitting at €0. Once the offer ends, the booking backend needs a private, reliable way to distinguish a first/expired fitting from a repeat visit, and to close online booking after a confirmed purchase. A browser-supplied “returning customer” flag would not be authoritative.

## Implementation

- Require a one-time email link for **every** online booking, including the first. This avoids revealing whether an address has a customer profile or purchase. The link is valid for 15 minutes, is consumed by a POST after a deliberate click, and yields a 30-minute HttpOnly, SameSite cookie. The link token is encrypted and placed in the URL fragment, not the HTTP request path or query.
- Store only hashed, short-lived issuance and redemption claim keys. A unique MongoDB index makes redemption single-use even under concurrent requests; a TTL index removes claims after 24 hours. Persistent per-address and per-IP request limits supplement the existing process-local limiter.
- Resolve the fee on the server from the verified normalized email, a private customer profile, and the latest **linked, completed** appointment whose end is in the past. The chosen new fitting date must fall no later than the two-year Europe/Dublin calendar anniversary of that visit. Each subsequent completed visit renews the window. A confirmed purchase closes online booking; staff arrange later visits by phone.
- The review step requests a server-side quote, but appointment creation and its Payload hook recalculate the decision before writing payment state. Stripe Checkout also rechecks confirmed purchases. Repeat appointments start `confirmed`/`unpaid` at €0 and never enter Stripe Checkout. Standard appointments retain the configured fee and `pending_payment` lifecycle.
- New verified bookings create and link a private customer profile if necessary. Historical appointments are **not** linked automatically; staff must review and link them before they can establish a repeat entitlement.
- The current welcome offer and Stripe credentials are unchanged. This PR does **not** switch the standard €20 fee on.

## Files changed

The focused changes are in `src/lib/customers/`, `src/lib/booking/createAppointment.ts`, `src/lib/booking/getBookingFeeQuote.ts`, the booking email-verification routes and UI, `src/collections/CustomerVerificationClaims.ts`, `src/migrations/`, generated Payload types, and corresponding integration/e2e tests. `src/config/indexation.ts` adds private headers for the verification page.

## Migration and rollback

`20261025_180000_add_customer_verification_claims` adds a unique claim-key index and a 24-hour TTL expiry index. It does not rewrite profiles or appointments. Run the approved migration gate before deploying code that accepts verification requests. Rollback removes indexes only if there are no claim records; after requests exist, preserve records and review a rollback plan. Reverting the application without dropping data returns the previous booking flow, but the welcome offer must remain active until Stripe and the new paid flow are verified.

## Tests and manual verification

- Run `npm ci`, `npm run generate:types`, `npm run generate:importmap`, `npm run lint`, `npm run test:int`, a fresh local migration run plus mandatory migration check, and `npm run build` against a local test database.
- Test a first verified booking, an unverified booking rejection, a linked completed repeat inside and outside the two-year window, a confirmed purchase, token expiry/replay/concurrent redemption, email send failure/retry, and Stripe bypass for €0.
- In Preview, open the form on mobile and desktop, request a link, use it once, return to the form, and confirm the address. Check another email cannot reuse the cookie. Inspect `Cache-Control`, `X-Robots-Tag`, rendered robots metadata, keyboard flow, screen-reader status, reduced motion, and axe results.
- Screenshots: [verification desktop](repeat-booking-verification-desktop.png), [verification mobile](repeat-booking-verification-mobile.png), [booking form desktop](repeat-booking-form-desktop.png), [booking form mobile](repeat-booking-form-mobile.png).

## Security, privacy, accessibility, SEO and cache

No customer phone, notes, full email content, secret, or Stripe payload is logged. Verification responses are generic until the email is proved. Tokens are never stored in plaintext, the verification page is `noindex`/`no-store`, and email-status requests are private POSTs. The public booking page does not server-render a verified email. Buttons have at least 44px targets and status updates use a live region. No public canonical, sitemap entry, catalogue cache, or dress availability changes.

## Known limitations

- Legacy visits require manual profile linking. There is no automatic historical backfill or data reinterpretation.
- The welcome offer still makes the configured public fee €0. The eventual €20 cutover and changed Stripe account need a separate reviewed release and provider smoke test.
- Live Google Workspace delivery has not been exercised with a customer address in local tests. The existing process-local IP limiter is not shared across instances; unique database claims enforce the per-address and per-IP issuance quotas.
- The owner confirmed that a 29 February visit remains eligible through 28 February, inclusive, two years later. A requested visit on 1 March is outside the free window.
