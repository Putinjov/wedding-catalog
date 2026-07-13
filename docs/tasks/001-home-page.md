# Task 001: Build the boutique home page

## Goal

Replace the current generic Payload frontend home page with a polished responsive wedding boutique landing page that matches the approved quiet-luxury direction.

Do not implement booking logic yet. This task is the visual and structural foundation only.

## First step

Inspect these files before writing code:

- `src/app/(frontend)/page.tsx`
- `src/app/(frontend)/layout.tsx`
- `src/app/(frontend)/globals.css`
- existing Header and Footer components
- `src/components/ui`
- the current `Dresses` collection and generated `Dress` type
- any existing media/image component in the Payload Website Template

Reuse working template helpers rather than rebuilding them blindly.

## Required sections

### 1. Announcement bar

A slim top bar with short text:

`Private fittings · Flexible rental · Handpicked dresses`

Hide or simplify it on very small screens if needed.

### 2. Header

Desktop:

- Text logo placeholder: `WEDDING`
- Navigation: Dresses, Rental, Sale, About, Contact
- Search icon
- Wishlist icon
- Account icon
- Bag icon only if one already exists in the project; otherwise omit it

Mobile:

- Menu trigger using the existing shadcn `Sheet`
- Logo
- Search and wishlist icons

Use internal links where routes exist. For routes that do not exist yet, use sensible placeholder hrefs such as `/dresses`, `/rental`, `/sale`, `/about`, `/contact`.

### 3. Hero

Two-column editorial layout on desktop, stacked or image-backed layout on mobile.

Copy:

- Eyebrow: `THE BRIDAL EDIT`
- Heading: `Find your dream dress`
- Body: `Luxury wedding dresses available to buy or rent, selected for modern brides.`
- Primary CTA: `Browse collection` linking to `/dresses`
- Secondary CTA: `Book a fitting` linking to `/book-a-fitting`

Use an existing suitable dress image from Payload media if the codebase has one. If there is no stable reusable image query, create the component so an image URL can be supplied cleanly and use a graceful neutral placeholder. Do not add a random external image host.

### 4. Service highlights

Three concise items:

- Curated collection
- Personal fitting
- Buy or rent

Use subtle icons from the project’s existing icon library.

### 5. Featured dresses

Fetch published active dresses through Payload Local API.

Query rules:

- collection: `dresses`
- published documents only
- `isActive = true`
- `featured = true`
- exclude `availabilityStatus = hidden`
- limit 4
- depth sufficient for `mainImage`

If fewer than four featured dresses exist, render the available results without breaking the layout.

Create reusable components:

- `DressCard`
- `DressGrid`
- `FeaturedDresses`

A dress card must show:

- main image
- dress name
- sale price when enabled
- rental price when enabled
- link to `/dresses/[slug]`
- subtle hover image zoom
- accessible image alt text

Do not add wishlist state yet. A visual icon without functionality should not pretend to work.

### 6. Fitting callout

Editorial banner with:

- Heading: `Book a private fitting`
- Short supporting copy
- CTA to `/book-a-fitting`

Use restrained styling and an image only if the existing media layer makes that straightforward.

### 7. Newsletter block

Static UI only:

- Heading: `Stay inspired`
- Email input
- Subscribe button

Do not invent a backend endpoint. The form may prevent submission and display no fake success state. Add a clear TODO comment for integration.

### 8. Footer

Include:

- Brand statement
- Shop links
- Information links
- Customer care links
- Copyright with current year
- Social icons only when they link somewhere real; otherwise omit them

## Design requirements

- Use existing shadcn `Button`, `Input`, `Separator`, and `Sheet`.
- Use CSS variables in `globals.css` for the main palette.
- Add an editorial serif font through `next/font/google`; use a readable sans-serif for body text.
- Avoid giant border radii.
- Avoid excessive shadows.
- Use generous spacing.
- Maximum content width around 1280px.
- Product card images should use a consistent portrait aspect ratio.
- Maintain visible keyboard focus states.
- Respect `prefers-reduced-motion`.

## Suggested component structure

Adapt to the repository rather than forcing this exact tree:

```text
src/components/
  boutique/
    announcement-bar.tsx
    boutique-header.tsx
    hero-section.tsx
    service-highlights.tsx
    dress-card.tsx
    dress-grid.tsx
    featured-dresses.tsx
    fitting-callout.tsx
    newsletter-section.tsx
    boutique-footer.tsx
```

## Data and typing

- Use `Dress` and `Media` types from `@/payload-types`.
- Handle Payload relationships that may be IDs or populated objects.
- Handle missing images and prices safely.
- Format euro prices with `Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })`.
- Do not use `any`.

## Out of scope

- Product detail page implementation
- Real booking workflow
- Real newsletter submission
- Authentication changes
- Checkout/cart
- Wishlist persistence
- Payload schema changes
- New npm dependencies unless absolutely necessary

## Acceptance criteria

- `/` renders the new landing page.
- `/dresses` remains working.
- Featured dresses come from Payload, not hard-coded data.
- Layout works at approximately 375px, 768px, 1024px and 1440px widths.
- No TypeScript errors introduced.
- No console errors on the home page.
- Existing Payload admin remains unaffected.
- Final response includes:
  - summary
  - changed files
  - commands run
  - test/build result
  - remaining TODOs
