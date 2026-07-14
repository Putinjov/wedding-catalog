# Task 002: Rebrand as CAIT Bridal and split Buy / Rent journeys

## Goal

Update the current bridal catalogue to use the CAIT Bridal brand and restructure the customer journey so buying and renting are clearly separated.

Do not implement payment processing in this task. Prepare the UI and data flow for a paid fitting booking with a default price of €20.

## Inputs

- Brand name: `CAIT Bridal`
- Tagline: `Your affordable wedding boutique`
- Logo file supplied by the project owner
- Brand guide: `docs/brand-guide.md`

## Important business rules

1. Buying and renting are separate customer journeys.
2. A dress may be sale only, rental only, or both.
3. Fitting appointments cost €20.
4. The fitting fee must be configurable, not hard-coded in multiple components.
5. Do not assume whether the €20 is refundable or credited toward a purchase/rental. Show neutral wording until that policy is decided.

## Required routes

### `/buy`

Catalogue containing only dresses where:

- `_status = published`
- `isActive = true`
- `forSale = true`
- `availabilityStatus != hidden`

### `/rent`

Catalogue containing only dresses where:

- `_status = published`
- `isActive = true`
- `availableForRent = true`
- `availabilityStatus != hidden`

### `/dresses`

Keep as an all-dresses catalogue or redirect to a choice screen. Prefer a simple choice screen with two prominent cards:

- Shop wedding dresses
- Rent wedding dresses

Do not remove backwards compatibility without checking existing links.

### `/book-a-fitting`

Create a clear booking introduction page that displays:

- `Private fitting`
- `€20 booking fee`
- Buy or Rent purpose selection
- A short explanation that payment will be required to confirm the appointment
- CTA placeholder for the future booking flow

Do not add fake payment success or a fake checkout.

## Home page changes

Replace the previous generic boutique identity with CAIT Bridal.

### Header

- Use `CAIT Bridal` as the text brand where a full logo is not suitable.
- Main navigation:
  - Buy
  - Rent
  - Book a fitting
  - About
  - Contact

### Hero

- Eyebrow: `CAIT BRIDAL`
- Heading: `Your dress, your way`
- Body: `Discover wedding dresses to buy or rent, with private fittings tailored to you.`
- Primary CTA: `Shop dresses` → `/buy`
- Secondary CTA: `Rent a dress` → `/rent`
- Tertiary text link: `Book a fitting · €20` → `/book-a-fitting`

### Buy / Rent split section

Add two large editorial cards directly below the hero.

#### Buy

- Heading: `Find the one to keep`
- Copy: `Explore new and selected wedding dresses available to purchase.`
- CTA: `Shop dresses`

#### Rent

- Heading: `Wear the dream for less`
- Copy: `Choose a beautiful gown for your day without the full purchase price.`
- CTA: `Browse rentals`

### Fitting callout

- Heading: `Book your private fitting`
- Price: `€20`
- Supporting copy must stay neutral regarding refunds or credit.
- CTA: `Choose a fitting`

## Design

Apply the palette and visual direction from `docs/brand-guide.md`.

The mood should be ivory, lavender, blush, sage and antique gold. Do not make the entire site pastel. Keep charcoal body text and strong button contrast.

## Logo handling

- Place the supplied logo in `public/brand/` using a clean filename.
- Use it in suitable places such as the footer, about section or restrained desktop brand area.
- Do not use the full square logo as a tiny navigation icon.
- Use a text wordmark in the header until a horizontal/transparent logo variant exists.
- Add a TODO noting that a production SVG or transparent PNG is required.

## Shared configuration

Create a single site settings file or constant, for example:

```ts
export const siteConfig = {
  name: 'CAIT Bridal',
  tagline: 'Your affordable wedding boutique',
  fittingFee: 20,
  currency: 'EUR',
}
```

Use it wherever the brand name, tagline or fitting fee appears.

## Reusable catalogue logic

Avoid duplicating almost identical buy and rent page code.

Create a reusable query or page component that accepts a mode:

```ts
type CatalogueMode = 'buy' | 'rent'
```

The mode determines Payload filter, page title, intro copy, displayed price label and CTA wording.

## Dress cards

For buy mode:

- Show sale price only
- CTA: `View dress`

For rent mode:

- Show rental price prominently
- Use wording such as `From €X rental`
- CTA: `View rental`

For all-dresses mode:

- Show both only when both apply

## Out of scope

- Stripe integration
- Actual appointment time-slot selection
- Refund policy
- Deducting the €20 from a later order
- Cart and checkout
- Customer accounts
- Changes to Payload schema unless strictly required

## Validation

Run:

```bash
npm run lint
npm run build
```

If build is blocked by MongoDB connectivity, report that separately from code failures.

## Final report

Include:

- files changed
- routes added/changed
- how Buy and Rent queries differ
- where the €20 fee is configured
- lint/build results
- remaining TODOs
