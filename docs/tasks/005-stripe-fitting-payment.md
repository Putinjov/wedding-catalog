# Task 005: Stripe payment for the €20 fitting fee

## Goal

Add Stripe-hosted Checkout for one purpose only:

- Private fitting booking fee: €20

Do not add online payment for dresses, rental price, security deposit, alterations, accessories, or any in-store purchase. Buying and renting dresses remain in-store processes.

## Existing flow

Task 004 already creates an appointment with:

- `status = pending`
- `paymentStatus = unpaid`
- fitting fee copied from `siteConfig`
- private database ID
- safe public reference
- selected purpose, dress, date, time and customer details

Task 005 continues from that appointment.

## Required payment flow

```text
Pending unpaid appointment
→ Create Stripe Checkout Session
→ Redirect to Stripe-hosted Checkout
→ Customer pays €20
→ Stripe webhook verifies payment
→ Appointment becomes paid + confirmed
```

The webhook is the source of truth. Do not confirm an appointment only because the customer reached a success URL.

## Stripe setup

Install the official Stripe server SDK with npm.

Add placeholders to `.env.example`:

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

Never commit real keys. Do not expose the secret key to the browser. Use Stripe-hosted Checkout, not a custom card form.

## Appointment fields

Extend `Appointments` with:

- `stripeCheckoutSessionId`: text, unique when present, admin read-only
- `stripePaymentIntentId`: text, admin read-only
- `amountPaid`: integer cents
- `paidAt`: date
- `stripeCustomerEmail`: email, optional
- `paymentFailureReason`: text, optional, admin-only
- `checkoutExpiresAt`: date, optional

Keep the existing:

- `paymentStatus`
- `status`
- `fittingFee`
- `currency`
- `publicReference`

Do not store card details.

## Payer identification

The appointment is the canonical record of who will attend.

When creating Checkout, include:

```ts
metadata: {
  appointmentId: appointment.id,
  publicReference: appointment.publicReference,
}
```

Also set:

```ts
client_reference_id: appointment.publicReference
customer_email: appointment.email
```

Do not identify the appointment by cardholder name. Someone else may pay.

Admin must show:

- customer name
- email
- phone
- appointment date/time
- purpose
- selected dress
- public reference
- payment status
- amount paid
- Stripe session ID
- Stripe payment intent ID
- Stripe customer email

## Checkout session creation

Create secure server-only logic, for example:

```text
POST /api/stripe/create-checkout-session
```

Input should be only a safe public appointment reference.

The server must:

1. load appointment by public reference
2. reject missing appointments
3. verify appointment is pending
4. verify it is not already paid
5. verify the slot is still valid
6. use the stored fitting fee
7. use the stored currency
8. create or reuse Checkout Session
9. save Checkout Session ID and expiration
10. return only the Checkout URL

Do not trust amount, currency, email, description or price from the browser.

Checkout item:

- product name: `CAIT Bridal private fitting`
- quantity: 1
- amount: stored fitting fee
- currency: stored appointment currency

Description example:

```text
Private fitting · 18 July 2026 at 14:00 · Ref CAIT-8K4M2Q
```

Do not expose phone or Mongo ID.

## Duplicate-click protection

Repeated clicks must not create many active sessions.

Implement one strategy and document it:

- reuse existing open Checkout Session
- expire prior session before creating another
- use an idempotency key tied to appointment/payment attempt

Paid appointments must never create another Checkout Session.

## URLs

Use:

```text
/book-a-fitting/payment/success?reference=<publicReference>&session_id={CHECKOUT_SESSION_ID}
/book-a-fitting/payment/cancelled?reference=<publicReference>
```

Do not place email, phone or Mongo ID in URLs.

## Pending page

Update `/book-a-fitting/pending/[reference]`.

Show real CTA:

```text
Pay €20 to confirm
```

On click:

- call server-side Checkout creation
- redirect to Stripe Checkout
- show loading
- prevent double submission
- show clear errors

When already paid, hide the payment CTA and show confirmed state.

## Success page

Create `/book-a-fitting/payment/success`.

It must load the appointment server-side and verify the Stripe session belongs to it.

Possible states:

- Paid and confirmed: `Your fitting is confirmed`
- Processing: `Your payment is being processed`
- Not paid: do not show success, offer retry/return

Show:

- customer name
- date
- time
- purpose
- selected dress
- public reference
- amount paid

Do not mutate payment state from the success page.

## Cancelled page

Create `/book-a-fitting/payment/cancelled`.

Show:

- payment was not completed
- appointment is not confirmed
- booking summary
- link back to pending page to retry

Do not cancel the appointment merely because Checkout was cancelled.

## Webhook

Create:

```text
POST /api/stripe/webhook
```

Requirements:

- use raw request body
- verify Stripe signature with `STRIPE_WEBHOOK_SECRET`
- reject invalid signatures
- never trust unverified JSON
- do not log customer personal data

Handle at minimum:

### `checkout.session.completed`

Verify:

- appointment metadata
- public reference
- expected amount
- expected currency
- Stripe session ID
- payment status
- Checkout mode is `payment`

Then update:

- `paymentStatus = paid`
- `status = confirmed`
- `amountPaid`
- `stripeCheckoutSessionId`
- `stripePaymentIntentId`
- `stripeCustomerEmail`
- `paidAt`

### `checkout.session.async_payment_succeeded`

Apply the same paid/confirmed result.

### `checkout.session.async_payment_failed`

Set:

- `paymentStatus = failed`
- safe internal failure reason

Do not auto-cancel the appointment.

### `checkout.session.expired`

If still unpaid:

- keep appointment pending
- keep or reset payment status to unpaid
- handle session fields consistently with retry strategy
- never downgrade a paid appointment

## Idempotency

Stripe may resend events.

Webhook processing must be safe when repeated:

- if already paid with matching session, return success without duplicate effects
- never downgrade `paid`
- never duplicate side effects

A full event-log collection is optional, not required unless needed for correctness.

## Slot integrity

Before Checkout Session creation, verify appointment is still pending/unpaid and its slot remains valid.

Before final confirmation, verify appointment still exists.

If an impossible slot conflict appears after payment, preserve payment information and flag for admin review. Never lose payment data.

## Admin presentation

Default columns should include:

- customerName
- startAt
- purpose
- status
- paymentStatus
- fittingFee
- amountPaid
- publicReference

Group payment fields and make them read-only where practical.

Add admin descriptions explaining:

- confirmed means the fitting payment was verified
- online payment covers fitting only
- dress purchase/rental is paid in store

## Security

- server-only Stripe client
- no card storage
- no secret key in client
- no public appointment list
- no raw IDs in customer URLs
- verified webhook signatures
- server-side amount calculation
- no personal data in logs
- validate all route input
- rate limiting may remain a TODO

## Local development note

Add `docs/stripe-development.md` describing:

1. run the app locally
2. run Stripe CLI forwarding to the webhook endpoint
3. copy local webhook signing secret to `.env`
4. use Stripe test card
5. verify webhook updates appointment

Do not include live keys.

## Out of scope

- online dress purchase
- online rental payment
- security deposit payment
- cart
- discount codes
- custom Stripe Elements
- refunds UI
- customer accounts
- email confirmation
- automatic expired-hold cleanup

## Acceptance criteria

- Stripe Checkout is used only for the fitting fee.
- Amount comes from stored appointment, not browser input.
- Checkout metadata links payment to appointment ID and public reference.
- Pending page redirects to Stripe Checkout.
- Webhook signature is verified.
- Appointment confirms only after verified webhook payment.
- Repeated webhooks are idempotent.
- Paid appointments cannot generate another session.
- Success page reads server-side state.
- Cancelled Checkout does not confirm/cancel the appointment.
- Admin clearly identifies attendee and payment state.
- No dress, rent or deposit charge exists.
- No TypeScript errors are introduced.

## Validation

Run:

```bash
npm.cmd run generate:types
npm.cmd run lint
npm.cmd run build
```

If build fails only due to MongoDB Atlas connectivity, report that separately.

## Manual tests

1. successful test payment
2. cancelled Checkout
3. retry after cancellation
4. double-click Pay
5. refresh pending page
6. success page before webhook
7. success page after webhook
8. duplicate webhook
9. invalid webhook signature
10. amount mismatch
11. currency mismatch
12. already-paid appointment
13. expired session
14. async failed event
15. payer name differs from appointment customer
16. no dress/rent/deposit charge
17. mobile flow

## Final report

Include:

- files changed
- Stripe SDK version
- env variables
- appointment fields added
- Checkout creation rules
- duplicate-click strategy
- webhook events handled
- idempotency behaviour
- amount/currency verification
- success/cancel behaviour
- admin changes
- validation results
- remaining TODOs
