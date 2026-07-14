# Stripe fitting-fee development

Stripe Checkout is used only for the €20 private fitting fee. Dress purchases, rentals,
security deposits, alterations, accessories and all other in-store purchases remain offline.

1. Copy the Stripe placeholders from `.env.example` into `.env` and set test values:

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   ```

2. Run the app with `npm.cmd run dev`.

3. In a second terminal, install and authenticate the Stripe CLI if needed, then forward
   Checkout events to the local webhook:

   ```text
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the signing secret printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET` and restart
   the app. The webhook must receive the raw request body so Stripe signature verification can
   succeed.

4. Complete a fitting booking, choose `Pay €20 to confirm`, and use Stripe’s test card
   `4242 4242 4242 4242` with any future expiry date, CVC and postcode.

5. Confirm that the webhook changes the appointment to `paymentStatus = paid`, records the
   integer-cent amount and Stripe identifiers, and sets the appointment to confirmed. The
   success page never changes appointment state itself.

For event-level testing, use the Stripe CLI or Dashboard test events for completed, async
payment succeeded/failed and expired Checkout Sessions. Never place live keys in `.env.example`
or commit them.
