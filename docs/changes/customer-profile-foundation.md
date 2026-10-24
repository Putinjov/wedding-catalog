# Private customer profile foundation

## Problem

The current admin client directory groups at most 1,000 appointments by email. It is not a durable customer profile and cannot reliably express a confirmed purchase or a dress order awaiting delivery.

## Scope

- Add an internal `customers` collection with a normalized unique email, optional phone, manual order progress, and a purchase-confirmation date. A purchase is recorded only after the order is confirmed and its deposit has been received.
- Add an optional `appointments.customer` relationship. Staff may link a record only when the appointment and profile emails match; existing appointments are not linked or reinterpreted.
- Keep profile reads restricted to authenticated appointment staff and profile writes to owner/manager roles. Linked profiles cannot be deleted until the relationship is reviewed.
- Version the public privacy notice to disclose private profiles and order tracking. Historical privacy snapshots remain available for existing appointment evidence.
- Add explicit MongoDB indexes for the unique profile email and appointment relationship.

This PR does **not** change fitting prices, Stripe, online repeat-booking eligibility, the existing appointment directory, or the welcome offer.

## Agreed follow-up rules

- A repeat customer proves email ownership using a single-use link. The server decides any €0 entitlement; the browser cannot self-declare it.
- After a genuinely completed visit, further visits are free until a purchase or for at most two years from the **most recent completed visit**, whichever comes first. Each newly completed visit renews this window. A booking exactly on the two-year Dublin-local anniversary is still eligible; later bookings are not.
- A confirmed purchase means an order confirmed and a deposit received. Thereafter online booking closes and further arrangements are by phone. The order can be marked as awaiting a deposit, awaiting the dress, ready for collection, or fulfilled.
- The rules above are **not active** in this schema PR. A separate reviewed PR must implement them before disabling the temporary welcome offer or charging €20.

## Migration and rollback

`20261024_120000_add_customer_profiles` creates only two indexes. It neither creates customer records nor backfills appointment relationships. Production deployment must wait for the approved migration gate. The migration's `down` refuses to remove the indexes once profiles or links exist; restoring an older application after data exists requires a reviewed data plan and must preserve the records.

## Verification

Run `npm ci`, Payload type/import-map generation, lint, integration tests, a fresh local migration run, the migration gate, and a production-like build. In the admin, confirm staff can view but not edit profiles, managers can create profiles, duplicate email casing is rejected, and the public API cannot read profiles. Check the updated privacy page at mobile and desktop widths; no public customer route or new indexable URL is added.

Privacy page screenshots: [mobile](customer-profile-privacy-mobile.png) and [desktop](customer-profile-privacy-desktop.png).
