# Task 004: Fitting booking flow and appointment data model

## Goal

Implement the first real booking flow for private fittings.

The customer must be able to:

1. open `/book-a-fitting`
2. choose Buy or Rent
3. optionally arrive with a preselected dress from the query string
4. choose a date
5. choose an available time
6. enter contact details
7. review the €20 fitting fee
8. submit a pending appointment request

This task must create the booking data model and user flow.

Do not integrate Stripe yet. Payment confirmation will be Task 005.

## Business rules

- Private fitting fee: €20
- Fee value must come from `siteConfig.fittingFee`
- Buy and Rent are separate purposes
- Appointment duration: 60 minutes
- No same-day booking
- Booking window: next 60 days
- Store timezone: `Europe/Dublin`
- Default working hours:
  - Tuesday to Saturday
  - 10:00 to 17:00
- Last available start time: 16:00
- Closed Sunday and Monday
- One fitting per slot
- Only active future slots may be selected
- A submitted appointment is initially `pending`
- Payment status is initially `unpaid`
- Do not claim the booking is confirmed before payment

## Important architecture rule

Do not hard-code schedule rules across multiple components.

Create one shared booking configuration, for example:

```ts
export const bookingConfig = {
  timezone: 'Europe/Dublin',
  durationMinutes: 60,
  bookingWindowDays: 60,
  closedWeekdays: [0, 1],
  workingHours: {
    start: '10:00',
    end: '17:00',
  },
}
```

Use this as the single source of truth.

## Payload collection

Create a new collection:

```text
Appointments
```

Suggested slug:

```text
appointments
```

### Required fields

- `purpose`
  - select
  - values: `buy`, `rent`
  - required

- `dress`
  - relationship to `dresses`
  - optional

- `customerName`
  - text
  - required

- `email`
  - email
  - required

- `phone`
  - text
  - required

- `notes`
  - textarea
  - optional

- `startAt`
  - date
  - required
  - store full datetime

- `endAt`
  - date
  - required
  - calculated from configured duration

- `status`
  - select
  - values:
    - `pending`
    - `confirmed`
    - `cancelled`
    - `completed`
    - `no-show`
  - default: `pending`

- `paymentStatus`
  - select
  - values:
    - `unpaid`
    - `pending`
    - `paid`
    - `refunded`
    - `failed`
  - default: `unpaid`

- `fittingFee`
  - number
  - required
  - store the fee at booking time
  - default from shared site configuration

- `currency`
  - select or text
  - default `EUR`

- `source`
  - select
  - values:
    - `website`
    - `admin`
  - default `website`

- `internalNotes`
  - textarea
  - admin only

### Admin UI

Group under:

```text
Bookings
```

Use default columns:

- customerName
- startAt
- purpose
- status
- paymentStatus
- fittingFee

Use a clear title such as customer name plus date where practical.

### Access

Public users must not have direct read access to appointment documents.

Website submission may use a server action or secure custom endpoint.

Do not expose unrestricted public create access directly through Payload REST.

Admin users retain normal management access.

## Validation

### Time validation

Reject a booking when:

- start time is in the past
- date is today
- date is outside the booking window
- day is Sunday or Monday
- time is outside working hours
- start time is not aligned to a valid 60-minute slot
- another non-cancelled appointment overlaps the slot

The final conflict check must happen on the server immediately before creation.

Do not rely only on disabled UI buttons.

### Contact validation

Use Zod.

- customer name: minimum 2 characters
- valid email
- phone: minimum sensible length
- notes: reasonable max length
- purpose: buy or rent
- dress slug/id: optional
- date/time: required

## Availability API or server action

Create a reusable server-side function to return available slots for a date.

Suggested shape:

```ts
type AvailableSlot = {
  startAt: string
  endAt: string
  label: string
}
```

It must:

- use Europe/Dublin timezone
- generate configured slots
- query existing appointments
- exclude conflicts
- ignore cancelled appointments
- return no slots for closed or invalid dates

Do not fetch all appointments in the browser.

## Booking route

Update:

```text
/book-a-fitting
```

### Query string support

Read:

- `dress=<slug>`
- `purpose=buy|rent`

When a valid dress slug is supplied:

- load the dress
- show a small selected-dress summary
- preselect purpose only if the dress supports that mode
- allow the customer to remove the dress selection

When the requested purpose is invalid for the dress:

- fall back to an available mode
- do not show an impossible selection

### Booking steps

Use a clear four-step UI:

1. Purpose
2. Date and time
3. Your details
4. Review

The flow may use one client component with controlled state.

Do not create separate routes for every step unless the existing project architecture strongly favours that.

### Step 1: Purpose

Options:

- Buy
- Rent

Explain briefly:

- Buy: fitting for dresses available to purchase
- Rent: fitting for dresses available to rent

### Step 2: Date and time

- date picker or accessible date input
- only dates within the 60-day window
- closed days must be disabled or rejected
- load available slots for selected date
- show loading, empty and error states
- time buttons must be keyboard accessible

Do not add a heavy calendar dependency unless already installed.

### Step 3: Customer details

Fields:

- name
- email
- phone
- notes

Show selected purpose, dress, date and time in a compact summary.

### Step 4: Review

Display:

- purpose
- dress when selected
- date
- time
- duration
- fitting fee: €20
- neutral message:
  `Payment will be required to confirm this appointment.`

Primary CTA:

```text
Continue to payment
```

For this task, submission should create a pending unpaid appointment and then redirect to a placeholder route:

```text
/book-a-fitting/pending/[id]
```

Do not pretend payment succeeded.

## Pending page

Create:

```text
/book-a-fitting/pending/[id]
```

It should show:

- `Appointment held pending payment`
- appointment summary
- €20 fitting fee
- notice that the appointment is not confirmed yet
- placeholder button:
  `Pay €20 to confirm`

The button must be visibly disabled or link to a clearly marked not-yet-implemented payment route.

Do not expose arbitrary appointment information publicly by sequential ID.

Use one of:

- a secure random public reference/token stored on the appointment
- a signed server-side token
- another privacy-safe approach

Do not place customer email or phone in the URL.

## Public booking reference

Add a public-safe reference field, for example:

```text
publicReference
```

Requirements:

- generated server-side
- random and non-sequential
- unique
- not editable by public users
- suitable for the pending page URL

Suggested route:

```text
/book-a-fitting/pending/[reference]
```

## Concurrency

Two users may attempt the same slot.

The server submission logic must:

1. validate input
2. query for conflicts
3. create the appointment
4. handle duplicate/conflict failure cleanly

A perfect distributed lock is out of scope, but do not omit the immediate server-side conflict check.

If a slot becomes unavailable before submission, return a user-friendly message and keep entered customer details.

## Components

Suggested structure:

```text
src/components/booking/
  booking-flow.tsx
  purpose-step.tsx
  date-time-step.tsx
  customer-details-step.tsx
  booking-review-step.tsx
  selected-dress-summary.tsx
  booking-summary.tsx
```

Adapt to the repository rather than forcing this exact tree.

## Shared utilities

Suggested files:

```text
src/config/booking.ts
src/lib/booking/getAvailableSlots.ts
src/lib/booking/createAppointment.ts
src/lib/booking/validation.ts
src/lib/booking/date.ts
```

## Date handling

Use the project’s existing date library if one is installed.

If not, prefer platform APIs plus a small timezone-safe implementation.

Do not add Moment.js.

All stored datetimes must be unambiguous ISO values.

All customer-facing times must be displayed in Europe/Dublin time.

## UX and design

Follow CAIT Bridal brand guide.

Use:

- ivory background
- deep lavender active states
- antique gold dividers
- blush/sage accents sparingly
- clear progress indicator
- strong mobile layout

The booking flow must work comfortably on a 375px-wide screen.

## Accessibility

- step headings
- proper field labels
- error messages associated with fields
- keyboard-accessible purpose and time selection
- visible focus states
- do not rely on colour alone
- announce server errors meaningfully
- preserve form values after validation failure

## Security and privacy

- do not log personal details
- do not return appointment lists publicly
- do not expose internal notes
- do not expose raw database IDs in public URLs
- validate all client data again on the server
- rate limiting may be added as a TODO if no existing infrastructure exists

## Out of scope

- Stripe integration
- email confirmation
- SMS/WhatsApp
- Google Calendar sync
- refunds
- rescheduling
- cancellation links
- admin calendar view
- deposit logic
- automatic cleanup of unpaid holds

## Acceptance criteria

- Appointments collection exists and is registered.
- Public read access is denied.
- `/book-a-fitting` supports purpose and optional dress preselection.
- Available slots are calculated server-side.
- Closed days and conflicts are enforced server-side.
- Submission creates a pending unpaid appointment.
- Stored fitting fee is copied from site configuration.
- Public pending page uses a safe random reference.
- No fake payment confirmation exists.
- Existing Buy, Rent and dress detail routes remain working.
- No Payload schema fields outside this task are changed.
- No TypeScript errors are introduced.

## Validation

Run:

```bash
npm.cmd run generate:types
npm.cmd run lint
npm.cmd run build
```

If build is blocked only by MongoDB Atlas connectivity or DNS, report that separately from code failures.

## Manual test matrix

Test:

1. Buy purpose without a dress
2. Rent purpose without a dress
3. Buy-only dress preselected
4. Rent-only dress preselected
5. Dual-mode dress with buy
6. Dual-mode dress with rent
7. Closed day
8. Same-day date
9. Date beyond 60 days
10. Already-booked slot
11. Invalid email
12. Double submission attempt
13. Mobile layout
14. Pending page privacy

## Final report

Include:

- files changed
- collection fields
- access model
- slot-generation rules
- conflict-check logic
- public-reference approach
- validation results
- remaining TODOs
