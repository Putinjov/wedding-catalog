# CAIT Bridal Manager

Standalone Expo/React Native manager app for the CAIT Bridal Payload backend.

## Included MVP

- Payload staff login with the session stored in the OS secure store
- Today dashboard and Europe/Dublin day calendar
- Appointment details, lifecycle actions, internal notes and rescheduling
- Manual appointment creation using server-authoritative available slots
- Client directory and booking timeline derived from appointment history
- Call, SMS, WhatsApp and email shortcuts
- Expo push registration and deep links for booking events

## Local development

```bash
cp .env.example .env
npm install
npm run typecheck
npm run lint
npm start
```

Use a LAN-reachable backend URL in `EXPO_PUBLIC_API_URL` when testing on a physical phone. The
production default is `https://caitbridal.ie`.

## Standalone builds

1. Sign in to the intended Expo account with `npx eas-cli login`.
2. Run `npx eas-cli init` and place the assigned project ID in
   `EXPO_PUBLIC_EAS_PROJECT_ID` / the EAS environment.
3. Configure iOS and Android push credentials in EAS.
4. Build an internal install with `npx eas-cli build --profile preview --platform ios` or
   `--platform android`.

The app uses `ie.caitbridal.manager` for both the iOS bundle identifier and Android package.

Push lock-screen copy intentionally excludes customer names, phone numbers and email addresses.
Opening a notification deep-links to the authenticated appointment detail screen.
