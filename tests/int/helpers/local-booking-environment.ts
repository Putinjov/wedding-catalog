export const localBookingOrigin = 'http://127.0.0.1:3000'

export function assertLocalBookingEnvironment(): void {
  const databaseURL = new URL(process.env.DATABASE_URL ?? '')
  const externalServices = [
    'SMTP_USER', 'SMTP_PASSWORD', 'EXPO_ACCESS_TOKEN', 'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT', 'R2_PUBLIC_URL',
  ]
  if (
    process.env.LOCAL_BOOKING_FLOW_TEST !== 'true' ||
    databaseURL.protocol !== 'mongodb:' || databaseURL.hostname !== '127.0.0.1' ||
    databaseURL.pathname !== '/repeat_booking_e2e' ||
    databaseURL.searchParams.get('directConnection') !== 'true' ||
    process.env.NEXT_PUBLIC_SERVER_URL !== localBookingOrigin || !process.env.PAYLOAD_SECRET ||
    externalServices.some((name) => Boolean(process.env[name]))
  ) {
    throw new Error('Local booking flow requires the isolated localhost database and disabled external services.')
  }
}
