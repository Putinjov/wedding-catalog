# Manager month calendar and booking closures

The mobile calendar now shows a Monday-first six-week month grid, appointment counts in Europe/Dublin, and closed dates. Tapping a date scrolls to the full appointment list for that day. Month navigation and Today are available.

Owners and managers can close or reopen one date or an inclusive date range. The authenticated global endpoint `/api/globals/booking-settings/closures` reuses existing closures and holidays. Closing merges adjacent ranges. Reopening can split an existing closure and removes holidays inside the selected range. Regular weekly days off and blocked time intervals remain enforced. Existing appointments are not cancelled, changed, or notified automatically.

The endpoint uses Payload access checks and a database transaction when supported; it expires the booking settings cache after saving. No schema migration or new collection is required. Concurrent edits may return a database conflict; refresh and retry in that case.

## Release

Deploy the updated backend before using closure controls. Build and install a fresh Android preview APK from this branch; the already-installed APK will not acquire these changes automatically. Keep the existing EAS project ID `31d7323a-e5e9-4412-ba95-082c23e717cc` in the build environment.

## Validation

Manager TypeScript and lint; root TypeScript and lint (existing unused dirname warning in Media.ts); nine closure tests covering permissions, invalid dates, range merging/splitting, leap days, idempotency, holiday removal, transaction commit, and authoritative opening-hours integration. Expo web export passed. Production booking creation and native push delivery still require device/backend testing.
