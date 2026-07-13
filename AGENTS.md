# AGENTS.md

## Project

Wedding dress catalogue built with Next.js, Payload CMS 3, MongoDB Atlas, TypeScript, Tailwind CSS and shadcn/ui.

The application supports both dress sales and rentals. The current repository already contains Payload collections for catalogue data and a working `/dresses` page.

## Working rules

- Read the existing code before changing anything.
- Preserve the Payload Website Template structure unless a change is clearly justified.
- Do not replace existing working shadcn components without a reason.
- Prefer Server Components. Add `"use client"` only when interaction or browser APIs require it.
- Fetch Payload data through the Payload Local API, never directly from MongoDB.
- Reuse generated types from `src/payload-types.ts`.
- Do not use `any`.
- Do not duplicate utilities or UI components.
- Keep components small and focused.
- Use semantic HTML and accessible labels.
- Ensure desktop and mobile layouts work.
- Do not add packages unless existing dependencies cannot solve the task.
- Do not expose secrets or commit `.env`.
- Do not change Payload collections or database schema unless the task explicitly requires it.

## Existing stack

- Next.js App Router
- Payload CMS 3
- MongoDB Atlas
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons where already available

## Paths

- Frontend routes: `src/app/(frontend)`
- Payload collections: `src/collections`
- Shared components: `src/components`
- shadcn components: `src/components/ui`
- Utilities: `src/utilities`
- Payload config: `src/payload.config.ts`
- Generated Payload types: `src/payload-types.ts`
- Task specifications: `docs/tasks`

## Code style

- Use named exports for reusable components.
- Use PascalCase for React components.
- Use kebab-case for route folders.
- Use clear domain names such as `DressCard`, `DressGrid`, `FeaturedDresses`.
- Keep page files thin. Move reusable rendering into components.
- Use absolute imports with `@/`.
- Prefer early returns over deeply nested conditionals.
- Avoid inline hard-coded repeated content. Put repeated navigation/config data into constants.
- Use `next/image` for site images where compatible with the existing Payload image setup.
- Use `next/link` for internal navigation.
- Keep visual tokens in CSS variables or shared styles rather than scattering arbitrary values.

## Design direction

The visual style is quiet luxury:

- Warm off-white background
- Dark charcoal text
- Warm beige accent
- Editorial serif headings
- Clean sans-serif body text
- Generous whitespace
- Minimal borders and shadows
- Small or nearly square radii
- Product imagery is dominant
- No loud gradients, neon colours or generic marketplace styling

Suggested tokens:

- background: `#FAF8F6`
- foreground: `#2C2621`
- secondary: `#EDE7E0`
- accent: `#C8B79A`
- muted: `#8B867C`
- border: `#E6E1D9`

## Validation

Before finishing a task:

1. Run the available lint command.
2. Run TypeScript/build checks when practical.
3. Check the affected route at desktop and mobile widths.
4. Report changed files.
5. Report commands run and any remaining warnings.
6. Do not claim success if checks fail.
