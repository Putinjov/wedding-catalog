# CAIT Bridal

CAIT Bridal is a Next.js and Payload CMS application for a wedding-dress catalogue, private
fitting bookings, Stripe fitting-fee payments and staff operations.

## Architecture

- Next.js App Router frontend and Payload Admin in one deployment
- Payload CMS 3 with the Local API for server-side data access
- MongoDB Atlas for catalogue, booking and Stripe event records
- Cloudflare R2 through Payload's S3 adapter for production media
- Stripe Checkout and signed webhooks for the private fitting fee
- Vercel for application hosting and Cloudflare for DNS

The production canonical origin is `https://caitbridal.ie`. Vercel preview deployments use their
own origin and return a disallow-all `robots.txt`.

## Requirements

- Node.js 22 (`.nvmrc` and `package.json` engines are authoritative)
- npm 10 or later
- MongoDB replica set or Atlas cluster
- Stripe CLI for local webhook testing

## Local setup

```bash
npm ci
cp .env.example .env
npm run generate:types
npm run generate:importmap
npm run dev
```

Open `http://localhost:3000` for the storefront and `/admin` for Payload Admin. Never commit `.env`
or production credentials.

## Validation

```bash
npm run generate:types
npm run generate:importmap
git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run lint
npm run test:int
npm run test:e2e
npm run build
```

The health endpoint is `GET /api/health`. It returns only configuration/database status and never
returns secrets.

## Production configuration

All variables listed in `.env.example` are required in production. Server configuration is parsed
by `src/config/env.ts` and deployment fails early when a required variable is missing or malformed.
Set `NEXT_PUBLIC_SERVER_URL=https://caitbridal.ie` without a path.

### Stripe

Configure the production webhook endpoint as:

```text
https://caitbridal.ie/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Use `docs/stripe-development.md` for local Stripe CLI setup. Checkout success pages never confirm a
booking by themselves; only a verified webhook can mark the fitting paid.

### Cloudflare R2

Create an R2 bucket, S3 API token and public custom media domain. Configure the five `R2_*`
variables from `.env.example`. When R2 is enabled, Payload local upload storage is disabled so
production uploads do not depend on Vercel's ephemeral filesystem.

The bucket CORS policy should permit the application origin and the methods used by Payload Admin.
Validate upload, thumbnail display, replacement and deletion after every storage-domain change.

## Deployment and rollback

Follow [docs/deployment.md](docs/deployment.md) for the production checklist, DNS cutover, smoke
tests and rollback procedure.

## Retained Payload template features

Pages, Posts, Categories, SEO, Redirects, Search and Form Builder remain because corresponding
routes, content models and generated types are still present. Removing them safely requires a
separate content/data migration. The demo seed endpoint is disabled in production.

## Data protection

Appointments contain customer contact details. Access is limited to the appointment team; audit and
processed Stripe event collections are owner-only. Retention and deletion decisions are documented
in `docs/deployment.md` and must be agreed with the business before launch.
