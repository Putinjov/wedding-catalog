# Manager month calendar and booking closures

The responsive web manager at `/manager` shows a Monday-first six-week month grid, appointment counts in Europe/Dublin, and closed dates. Selecting a date displays the daily schedule below the calendar. Month navigation and Today are available.

Owners and managers can close or reopen one date or an inclusive date range. The authenticated global endpoint `/api/globals/booking-settings/closures` reuses existing closures and holidays. Closing merges adjacent ranges. Reopening can split an existing closure and removes holidays inside the selected range. Regular weekly days off and blocked time intervals remain enforced. Existing appointments are not cancelled, changed, or notified automatically.

The endpoint uses Payload access checks and a database transaction when supported; it expires the booking settings cache after saving. No schema migration or new collection is required. Concurrent edits may return a database conflict; refresh and retry in that case.

## Release

Deploy the web application and verify closure controls in `/manager`.

## Validation

Run the root lint, integration tests and production build. Verify closing and reopening dates and intervals in the web manager.
