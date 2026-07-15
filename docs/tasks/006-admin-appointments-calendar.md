# Task 006: Admin appointments calendar

## Goal

Create an admin-only calendar for CAIT Bridal appointments.

The owner must be able to:

- view appointments by week and day
- see free and occupied fitting slots
- distinguish appointment and payment states
- open appointment details
- update appointment status with server-side validation
- create appointments manually
- keep the existing Payload Appointments list

Reuse the existing `Appointments` collection, `bookingConfig`, Europe/Dublin timezone utilities, slot conflict logic and Stripe payment fields.

## Admin route

Add a Payload custom admin view, preferably:

```text
/admin/appointments-calendar
```

Add navigation:

```text
Bookings
- Appointments
- Calendar
```

Authentication is required for the view and every related endpoint/action.

Do not expose appointment data through public frontend routes.

## Week view

- Monday to Sunday columns
- working-hour rows derived from `bookingConfig`
- Tuesday to Saturday active
- Sunday and Monday marked closed
- current day highlighted
- previous week, next week and Today controls
- appointment cards positioned by start time

## Day view

Show:

- chronological slots
- free and occupied states
- customer name
- purpose: Buy or Rent
- selected dress when present
- appointment status
- payment status
- public reference

Generate a day schedule once. Do not make one API request per slot.

## Calendar data query

Query by visible date range only.

Suggested response:

```ts
type CalendarAppointment = {
  id: string
  publicReference: string
  customerName: string
  startAt: string
  endAt: string
  purpose: 'buy' | 'rent'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed'
  dress?: {
    id: string
    name: string
    slug?: string | null
  } | null
}
```

Do not include email, phone, internal notes or Stripe IDs in the overview response.

Use one range query, sort by `startAt`, and avoid N+1 requests.

## Timezone

- Display in `Europe/Dublin`
- query/store ISO datetimes
- handle daylight saving correctly
- reuse existing date utilities
- do not hard-code UTC offsets

## Filters and summary

Filters:

- status
- payment status
- purpose
- customer name
- selected date/week
- quick filter for unpaid
- quick filter for upcoming

Summary counters for loaded range:

- total
- confirmed
- pending payment
- cancelled
- completed
- no-show

Counters must derive from the same loaded dataset.

## Appointment detail drawer

Clicking an appointment opens an accessible drawer/modal showing:

- customer name
- email
- phone
- purpose
- selected dress
- date and time
- status
- payment status
- fitting fee
- amount paid
- public reference
- source
- customer notes
- internal notes
- collapsed technical section with Stripe session/payment intent IDs

Actions:

- Mark confirmed
- Mark completed
- Mark no-show
- Cancel appointment
- Revert to pending when valid
- Open full Payload edit page

Payment status must not be casually editable from this drawer.

## Server-side status transition rules

Create one shared status-update function.

### Confirmed

Allowed when:

- `paymentStatus = paid`, or
- `source = admin` and admin explicitly confirms an unpaid manual booking

Unpaid website appointments must not be silently confirmed.

### Completed

- appointment must be in the past
- normally current status must be confirmed

### No-show

- appointment must be in the past
- normally current status must be confirmed

### Cancelled

- allowed from pending or confirmed
- paid cancellation must show:
  `Payment is not automatically refunded.`

Do not perform automatic refunds.

### Pending

- do not reopen completed or no-show appointments
- reopening cancelled paid appointments requires a clear warning

Validate every transition on the server.

## Manual admin appointment creation

Add `New appointment`.

Fields:

- purpose
- optional dress
- date
- time
- customer name
- email
- phone
- notes
- initial status

Rules:

- reuse existing slot generation and conflict checks
- source = admin
- paymentStatus = unpaid
- fittingFee from `siteConfig`
- public reference generated using existing logic
- allow explicit admin confirmation without Stripe, with a warning
- prevent overlapping appointments

Do not create a second appointment model.

## Status presentation

Show both text and visual state.

Appointment statuses:

- pending
- confirmed
- cancelled
- completed
- no-show

Payment statuses:

- unpaid
- pending
- paid
- refunded
- failed

Do not rely on colour alone.

## Mobile and accessibility

- day-first layout on narrow screens
- no unusable wide table
- keyboard-accessible controls
- appointment cards must be buttons or links
- visible focus states
- accessible modal/drawer focus management
- status text readable without colour
- use `aria-current` for current date where appropriate

## Security

- verify Payload admin authentication in every calendar endpoint/action
- public users receive 401/403
- no arbitrary collection update endpoint
- no customer personal data in logs
- no public appointment list
- Stripe/payment flow remains unchanged

## Design

Operational rather than decorative, but aligned with CAIT Bridal:

- ivory/warm neutral surfaces
- deep lavender accents
- antique gold separators sparingly
- strong contrast
- compact admin spacing
- no floral decoration in the working calendar

## Suggested files

Adapt to Payload 3 conventions:

```text
src/components/admin/appointments-calendar/
  appointments-calendar.tsx
  calendar-toolbar.tsx
  week-view.tsx
  day-view.tsx
  appointment-card.tsx
  appointment-drawer.tsx
  calendar-filters.tsx
  calendar-summary.tsx
  new-appointment-dialog.tsx

src/lib/admin/appointments/
  getCalendarAppointments.ts
  updateAppointmentStatus.ts
  createAdminAppointment.ts
  calendarTypes.ts
```

## Out of scope

- drag and drop
- customer rescheduling
- customer cancellation links
- refunds
- email/SMS
- Google Calendar
- staff assignment
- multiple locations
- multiple fitting rooms
- analytics/revenue charts
- waitlist

## Acceptance criteria

- Admin-only calendar exists.
- Week and day views work.
- Date navigation works.
- Dublin timezone is correct.
- Only the visible range is queried.
- Free slots appear in day view.
- Detail drawer works.
- Status transitions are validated server-side.
- Unpaid website appointments cannot be silently confirmed.
- Paid cancellations show refund warning.
- Admin appointments can be created with conflict checks.
- Existing Payload list, public booking and Stripe flows still work.
- No TypeScript errors are introduced.

## Validation

Run:

```bash
npm.cmd run generate:types
npm.cmd run lint
npm.cmd run build
```

Report MongoDB Atlas connectivity separately from code failures.

## Manual tests

1. Current week
2. Previous/next week
3. Today shortcut
4. Day view
5. Paid confirmed appointment
6. Pending unpaid appointment
7. Cancelled appointment
8. Completed appointment
9. No-show appointment
10. Unpaid filter
11. Customer search
12. Detail drawer
13. Confirm paid appointment
14. Reject confirming unpaid website appointment
15. Cancel paid appointment and show warning
16. Complete past confirmed appointment
17. Reject completing future appointment
18. Mark past appointment no-show
19. Create admin appointment in free slot
20. Reject conflicting admin appointment
21. Closed Sunday/Monday
22. Narrow/mobile admin layout
23. Public user denied
24. Existing Stripe flow unchanged

## Final report

Include:

- files changed
- custom admin route/view
- authentication approach
- query strategy
- timezone handling
- status transition rules
- manual appointment rules
- filters/counters
- validation results
- remaining TODOs
