# Privacy, retention and data-subject requests

This document records the Task 20 operational baseline for Ireland and GDPR. Policy copy is
versioned in `src/config/privacy.ts`; the current policy version is `2026-08-09` and the canonical
public path is `/privacy` (`https://caitbridal.ie/privacy` in production).

## Booking privacy evidence

- Website bookings require an acknowledgement that the customer read the Privacy Policy. This is
  not consent as the legal basis for processing the booking.
- The backend records the policy version, display time and source, plus SHA-256 hashes of the exact
  notice and acknowledgement copy. Client-supplied timestamps, versions and hashes are ignored.
- Email marketing uses a separate optional checkbox. It is unchecked by default and never affects
  booking eligibility. SMS marketing would require a separate consent flow.
- Manual admin bookings must record when and how the privacy notice was provided. They do not infer
  an acknowledgement or marketing consent; marketing remains `not_asked`.
- Do not copy consent text, phone numbers, notes or full email addresses into logs or Stripe
  metadata.

When policy copy changes, append a new immutable snapshot in `src/config/privacy.ts`. Do not edit or
remove a snapshot referenced by an appointment.

## Retention schedule

| Category | Retention |
| --- | --- |
| Expired or abandoned unpaid booking with no service | 30 days after last activity or failed payment |
| Cancelled appointment | 12 months after the later of cancellation or scheduled appointment |
| Completed appointment, full operational record | 24 months after the appointment |
| Minimal completed-booking contract or claims record | 6 years |
| Payment, invoice, refund, dispute and accounting record | 6 years after the relevant financial or tax year |
| Active email-marketing consent | Until withdrawal or the marketing programme ends |

After 12 or 24 months, as applicable, remove contact details, free-form notes and unnecessary
operational fields. A six-year minimal record may retain only justified data such as customer name,
service/date/amount, invoice reference, and required Stripe payment/refund/dispute identifiers.

Automated retention enforcement is not part of Task 20. It is an explicit Task 43 dependency after
the appointment lifecycle and expired-hold work are in place. That future cron must be bounded,
authenticated, observable and idempotent, and must support legal retention locks.

## Access, export and deletion procedure

The public privacy contact is `sales@caitbridal.ie`, published on `/contact`. Email-marketing
withdrawal requests use the same channel and are currently processed manually. The response must
not disclose whether a matching customer record exists until identity has been verified.

1. Accept the request through the public privacy/contact channel.
2. Verify identity by a proportionate method.
3. Register the request, scope and deadline without copying unnecessary PII into logs.
4. Search the primary database, files, email/SMS providers, analytics and Stripe as applicable.
5. Provide a CSV or JSON export with a clear field description through a protected link.
6. For deletion, delete or anonymise data that is no longer needed.
7. Isolate and restrict legally retained records; never use them for marketing.
8. Allow deleted backup data to age out within the rolling backup period, targeted at no more than
   35 days. Reapply deletion tombstones after any backup restoration.
9. Tell the customer what was deleted, what remains, the reason, and the expected final deletion
   date.

The standard response period is one month. Complex requests may be extended by up to two more
months when the customer is notified within the first month. Legal and substantiated claims records
may remain under a retention lock.

Stripe transaction, invoice, refund, dispute or chargeback records needed for tax, fraud prevention
or claims are not deleted merely because the local customer record is removed. Remove unnecessary
Stripe Customer metadata and explain that Stripe may independently retain information under its
own legal obligations.
