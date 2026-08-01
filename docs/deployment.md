# CAIT Bridal deployment checklist

## 1. Release inputs

- [ ] Use Node.js 24 locally, in CI and in Vercel.
- [ ] Confirm the release commit passed GitHub Actions.
- [ ] Confirm no `.env`, customer export or credentials are tracked by Git.
- [ ] Set every required provider variable from `.env.example` in the correct Vercel environment.
- [ ] Keep preview/test Stripe and R2 credentials separate from production.

## 2. Production variables

Required server variables:

```text
DATABASE_URL
PAYLOAD_SECRET
NEXT_PUBLIC_SERVER_URL
PREVIEW_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CRON_SECRET
R2_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
R2_PUBLIC_URL
```

Vercel supplies `VERCEL_ENV=production`, which enables the migration check automatically. For any
other production build environment, set the non-secret variable `MIGRATION_GATE_REQUIRED=true`.

`NEXT_PUBLIC_SERVER_URL` must be `https://caitbridal.ie`. URL values may not contain credentials,
query strings or fragments. `R2_PUBLIC_URL` may include a base path; trailing slashes are normalized.

## 3. Pre-deploy evidence

From a clean checkout:

```bash
npm ci
npm run generate:types
npm run generate:importmap
git diff --exit-code -- src/payload-types.ts "src/app/(payload)/admin/importMap.js"
npm run lint
npm run test:int
npm run build
```

Record the Node/npm versions and the successful command output in the PR description.

## 4. MongoDB Atlas

- [ ] Use a least-privilege database user and a unique production database.
- [ ] Confirm DNS SRV, TLS trust and TCP access from the deployment environment.
- [ ] Confirm Atlas backups and restore procedure.
- [ ] Confirm the unique appointment slot-lock index exists after Payload starts.
- [ ] Do not infer an IP allowlist issue from a generic driver message; verify network evidence.

## 5. Production migration gate

Payload migrations must run as a single protected release step. Application startup and Next.js
build workers never apply migrations. A Vercel production build checks migration history and stops
before compilation when a migration file has not been recorded in `payload-migrations`.

Configure GitHub before the first production migration:

- [ ] Create a protected GitHub environment named `production`.
- [ ] Add required reviewers and prevent self-approval where the repository plan supports it.
- [ ] Add every production variable listed in section 2 as an environment secret.
- [ ] Limit workflow write access to trusted maintainers; the workflow has read-only repository
      permissions and always checks out the current default branch.

Release order:

1. Merge the validated release commit into the default branch. A production deployment with pending
   migrations will fail closed and will not replace the current deployment.
2. In GitHub Actions, run **Production migration gate** and select `MIGRATE_PRODUCTION`.
3. Approve the protected `production` environment request.
4. Confirm `npm run migrations:run` and the following `migrations:check` both succeed. Logs may list
   migration filenames but must never contain the database URL or secrets.
5. Redeploy the exact default-branch commit in Vercel.
6. Verify `/api/health`, Payload Admin and affected storefront routes before promoting or announcing
   the release.

The workflow uses `concurrency: production-database-migrations` with cancellation disabled, so two
workflow runs cannot migrate the production database simultaneously. Do not run production
migrations from a developer workstation or a Vercel build command.

## 6. Cloudflare R2 media

- [ ] Confirm the S3 endpoint, bucket and public media origin.
- [ ] Configure bucket CORS for `https://caitbridal.ie` and the required Payload operations.
- [ ] Upload a new image in Payload Admin.
- [ ] Confirm original and generated thumbnail URLs load through `R2_PUBLIC_URL`.
- [ ] Replace the image and verify the updated asset.
- [ ] Delete the test image and verify the object is removed from R2.
- [ ] Confirm no production media file was written to the Vercel filesystem.

These checks are manual because CI must never perform real R2 writes.

## 7. Stripe test-mode acceptance

- [ ] Point a test-mode webhook at `/api/stripe/webhook`.
- [ ] Create a fitting and complete Checkout once.
- [ ] Confirm the appointment becomes `paid` and `confirmed` exactly once.
- [ ] Replay the same event and confirm the state remains unchanged.
- [ ] Exercise expired, async success and async failure events.
- [ ] Confirm logs include only the Stripe event ID/type and no customer data.
- [ ] Confirm failed claims can be retried and stale `processing` claims recover after five minutes.

## 8. Vercel smoke test

- [ ] `GET /api/health` returns HTTP 200 and `status: ok`.
- [ ] Storefront, `/dresses`, `/book-a-fitting` and `/admin` load.
- [ ] Preview deployments return a disallow-all `/robots.txt`.
- [ ] Production canonical metadata uses `https://caitbridal.ie`.
- [ ] Pending/payment routes return noindex and no-store headers.
- [ ] Sitemap index references the two dynamic Payload sitemap routes once.

## 9. DNS cutover

- [ ] Add the Vercel domain configuration for `caitbridal.ie` and `www.caitbridal.ie`.
- [ ] Configure Cloudflare DNS records exactly as Vercel reports.
- [ ] Redirect `www.caitbridal.ie` to the apex canonical domain.
- [ ] Keep Cloudflare SSL mode at Full (strict).
- [ ] Verify HTTPS, redirects and certificate issuance before announcing launch.

## 10. GDPR and retention

- [ ] Agree the retention period for unpaid/abandoned appointments.
- [ ] Agree the retention period for completed appointment contact details.
- [ ] Retain immutable payment/audit metadata only as long as operational/legal needs require.
- [ ] Document the customer deletion/export process and which Stripe records remain legally required.
- [ ] Never place phone, notes or full email addresses in Stripe metadata or server logs.

## 11. Rollback

1. Do not run `migrate:down` automatically. Read the migration-specific rollback notes and confirm
   that no data created after migration would be destroyed or reinterpreted.
2. Promote the previous known-good Vercel deployment only when it is compatible with the current
   database shape.
3. Do not roll back MongoDB documents blindly; restore an Atlas backup only through an approved
   incident procedure.
4. Restore the previous Stripe webhook endpoint only if its code remains compatible with current
   appointment records.
5. Keep R2 objects intact during application rollback.
6. Run `/api/health`, storefront, admin and one Stripe test-mode booking after rollback.

## Deferred improvements

- Replace the process-local public endpoint rate limiter with shared Cloudflare/Vercel-compatible KV
  before horizontal traffic requires globally consistent limits.
- Remove unused Payload template collections/plugins only in a dedicated content migration.
- Add an external error-monitoring provider; current logging provides correlation-safe integration
  points without choosing a vendor.
