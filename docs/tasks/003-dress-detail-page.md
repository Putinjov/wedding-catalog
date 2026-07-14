# Task 003: Dress detail page with Buy / Rent modes

## Goal

Create a polished dynamic dress detail page at:

```text
/dresses/[slug]
```

The page must support three product states:

1. Buy only
2. Rent only
3. Buy and Rent

The UI must clearly separate purchase and rental information without duplicating the entire page.

Do not implement checkout or payment yet.

## First step

Inspect the current repository before changing code, especially:

- `src/collections/Dresses.ts`
- `src/payload-types.ts`
- `src/lib/getDresses.ts`
- `src/lib/catalogue.ts`
- current `DressCard`
- current media/image helpers
- `/buy`
- `/rent`
- `/book-a-fitting`
- `src/config/site.ts`

Reuse existing query helpers and UI patterns where practical.

## Route

Create:

```text
src/app/(frontend)/dresses/[slug]/page.tsx
```

Use a server component.

The page must:

- query Payload using Local API
- find one published active dress by slug
- exclude hidden dresses
- return `notFound()` when no valid dress exists
- use sufficient relationship depth for media and lookup labels
- generate metadata from Payload SEO fields when available
- fall back to dress name and short description

## Query rules

A dress is valid when:

- `_status = published`
- `isActive = true`
- `availabilityStatus != hidden`
- `slug = route param`

Do not query MongoDB directly.

## Page layout

### Desktop

Two-column layout:

- Left: image gallery
- Right: sticky product information panel

### Mobile

Single-column flow:

1. gallery
2. name
3. pricing/mode selector
4. CTAs
5. details
6. related dresses

## Gallery

Create a reusable gallery component.

Requirements:

- main image
- gallery images
- portrait-oriented presentation
- thumbnails on desktop
- swipe-friendly horizontal or stacked layout on mobile
- use existing Payload media helpers if available
- graceful fallback when gallery is empty
- correct alt text
- no broken image element
- no new carousel dependency unless absolutely necessary

A lightweight CSS/React solution is preferred.

## Product header

Display:

- designer name when populated
- dress name
- collection name when populated
- short description
- availability badge
- condition only when useful to the customer

Do not expose internal SKU prominently. It may appear in a muted details area.

## Buy / Rent mode logic

Create a reusable type:

```ts
type DressMode = 'buy' | 'rent'
```

### Buy-only dress

Show:

- sale price
- previous sale price when present and greater than sale price
- fitting CTA
- no rental controls

### Rent-only dress

Show:

- rental price
- security deposit
- rental period
- availability CTA
- fitting CTA
- no purchase controls

### Buy-and-rent dress

Show an accessible mode selector:

```text
Buy | Rent
```

The selected mode changes:

- displayed price
- supporting details
- main CTA label
- relevant information block

The selector requires a small client component. Keep the rest of the page server-rendered.

Default mode:

- use `?mode=rent` or `?mode=buy` when valid
- otherwise default to `buy` when forSale is true
- otherwise use `rent`

The page should preserve mode links with normal URL search params where practical.

## Pricing

Use the existing euro formatter or create one shared formatter.

### Buy mode

Display:

- `€1,200.00`
- previous price as visually subdued/struck through when applicable

### Rent mode

Display:

- `From €350.00 rental`
- `Security deposit: €200.00`
- `Standard rental period: 4 days`

Do not describe the deposit as a payment or refund until policy is defined.

## CTAs

### Common fitting CTA

Use:

```text
Book a fitting · €20
```

The fee must come from `siteConfig.fittingFee`.

Link to:

```text
/book-a-fitting?dress=<slug>&purpose=<buy|rent>
```

### Buy mode primary CTA

Since checkout is not implemented:

```text
Book a fitting · €20
```

Secondary action:

```text
Enquire about this dress
```

The enquiry action may link to `/contact?dress=<slug>&purpose=buy`.

### Rent mode primary CTA

```text
Check rental availability
```

Until calendar logic exists, link to:

```text
/book-a-fitting?dress=<slug>&purpose=rent
```

Secondary action:

```text
Book a fitting · €20
```

Do not create fake availability results.

## Details sections

Create accessible expandable or tabbed sections using existing UI components.

Suggested sections:

### Details

- category
- designer
- collection
- silhouette
- fabrics
- colours
- available sizes
- condition
- SKU

### Description

Render the existing rich text safely using the project’s Payload rich-text renderer.

### Rental information

Show only when rental is available:

- rental price
- deposit
- rental period
- neutral text that final availability is confirmed during booking

### Care and fitting

Static, restrained copy:

- fittings are private
- fitting booking fee is €20
- final alterations, cleaning, collection and return policies will be confirmed separately

Do not invent detailed policies.

## Related dresses

Create a related dresses query:

- published
- active
- not hidden
- exclude current dress ID
- prefer same category or silhouette
- limit 4

Render with the existing `DressCard` / `DressGrid`.

When the current mode is rent, prefer rental-enabled related dresses.

When the current mode is buy, prefer sale-enabled related dresses.

If no related dresses exist, omit the section.

## Availability status presentation

Map internal values to customer-facing labels:

- available → Available
- reserved → Reserved
- rented → Currently rented
- sold → Sold
- cleaning → Preparing
- repair → Temporarily unavailable
- hidden → never rendered

The CTA must be disabled or replaced with a neutral unavailable message when appropriate:

- sold in buy mode
- rented/reserved/cleaning/repair in rent mode

Do not rely only on colour to communicate status.

## SEO

Use existing Payload SEO fields when present:

- meta title
- meta description
- meta image

Fallback:

```text
<dress name> | CAIT Bridal
```

Description fallback should use `shortDescription`.

## Brand and design

Follow:

```text
docs/brand-guide.md
```

Use:

- ivory page background
- deep lavender for headings/accents
- antique gold for restrained separators/details
- charcoal body text
- blush/sage only as secondary accents

The page should feel romantic and editorial, not like a generic marketplace.

## Accessibility

- keyboard-accessible mode selector
- visible focus states
- semantic headings
- alt text for all images
- buttons and links must have clear labels
- no clickable `div`
- respect reduced motion
- price and status must be understandable without colour

## Loading and error handling

Add an appropriate route-level loading state if the current project pattern supports it.

Use `notFound()` for missing/invalid dresses.

Do not catch and hide database errors as fake empty states.

## Out of scope

- Stripe
- cart
- checkout
- actual rental calendar
- wishlist persistence
- customer login
- product reviews
- Payload schema changes
- refund/credit policy
- deposit payment logic

## Suggested components

Adapt to existing structure:

```text
src/components/boutique/
  dress-gallery.tsx
  dress-mode-selector.tsx
  dress-price-panel.tsx
  dress-details.tsx
  related-dresses.tsx
```

Avoid forcing this exact tree if the existing project has a clearer convention.

## Acceptance criteria

- `/dresses/[slug]` renders a published dress.
- Buy-only, rent-only and dual-mode dresses render correctly.
- `?mode=buy` and `?mode=rent` work when valid.
- The fitting CTA displays €20 from shared config.
- No duplicated fee constants.
- Hidden or unpublished dresses return 404.
- Related dresses respect the active mode.
- No TypeScript errors.
- Existing `/buy`, `/rent`, `/dresses`, `/book-a-fitting` remain working.
- Payload admin remains unaffected.

## Validation

Run:

```bash
npm.cmd run lint
npm.cmd run build
```

If build fails only due to MongoDB Atlas connectivity or DNS, report that separately from code failures.

## Final report

Include:

- files changed
- new components
- query behaviour
- Buy / Rent mode behaviour
- unavailable-state behaviour
- lint/build results
- remaining TODOs
