# Task 31 accessibility smoke-test results

Date: 2026-08-20

Timezone: Europe/Dublin

Test surface: local Next.js development server using Chromium and Playwright

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Axe WCAG 2.0 A/AA, 2.1 A/AA and 2.2 AA | Passed | No serious or critical violations on `/book-a-fitting` or the open desktop booking dialog. |
| Colour contrast | Passed | Axe `color-contrast` passed after darkening the deep-lavender token and correcting selected-purpose text colours. |
| Keyboard navigation | Passed within the non-mutating automated scope | Keyboard-only navigation reaches the date/time step, triggers validation, and moves focus to the invalid date group. Integration coverage reaches review and verifies that review and submit are separate DOM controls. |
| Touch targets | Passed | Booking purpose/actions/calendar controls are at least 44px; name, email and phone inputs use `min-h-11`. |
| Reduced motion | Passed | With `prefers-reduced-motion: reduce`, transition duration resolves to no more than 0.01ms and the booking route contains no autoplay video or audio. |
| 200% zoom reflow proxy | Passed | A 640px CSS viewport, equivalent to a 1280px layout at 200% zoom, has no horizontal document overflow. |
| Mobile layout | Passed | iPhone 13 and Pixel 7 viewport checks confirm the dedicated booking page, reachable action bar and reserved safe-area space. |
| LAN-origin hydration | Passed in automated real-origin coverage | Chromium loaded `http://192.168.1.12:3000`, opened the mobile menu and advanced to the date/time step. `ALLOWED_DEV_ORIGINS` is development-only and prevents Next.js from blocking client resources during real-device LAN testing. |
| Desktop dialog | Passed | Focus remains trapped in the dialog; Escape and browser Back close it and remove modal URL state. |

Run the focused suite with:

```bash
npm run test:a11y
```

The automated booking test intentionally does not activate `Continue to payment`. It must not create
appointments, reserve slots, send email or create Stripe sessions.

## Manual assistive-technology checks

These checks require real platform assistive technology and must not be recorded as passed from a
Windows headless-browser simulation.

| Check | Status | Required smoke flow |
| --- | --- | --- |
| Browser zoom at 200% | Pending confirmation | Set browser zoom to 200%, complete all four booking steps, and confirm there is no horizontal page scroll or obscured action. |
| VoiceOver on iPhone or macOS | Pending confirmation | Navigate purpose, date, time, details, privacy acknowledgement and review; confirm labels, required/optional state, errors, step announcements and focus order. Do not submit payment. |
| TalkBack on Android | Pending confirmation | Repeat the same non-submitting booking flow and confirm the fixed action bar does not obscure the focused field when the keyboard opens. |
| Physical-phone client interactions | Passed by user confirmation | After a full tab restart on a real phone, the mobile menu opens and `Continue to date and time` advances the booking flow through the LAN URL. Device and browser details were not recorded. |
| Keyboard-only full flow | Pending confirmation | Reach `Continue to payment` using Tab, Shift+Tab, arrows, Space and Enter only; do not activate the payment button. |

Do not enter real customer information during smoke testing. Use non-sensitive synthetic values and
stop at the enabled `Continue to payment` button so that no appointment or Stripe session is created.
