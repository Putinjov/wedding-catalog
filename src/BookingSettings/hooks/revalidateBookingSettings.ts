import { revalidateTag } from 'next/cache'
import type { GlobalAfterChangeHook } from 'payload'

export const revalidateBookingSettings: GlobalAfterChangeHook = ({
  context,
  doc,
  req: { payload },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info('Revalidating booking settings')
    revalidateTag('global_booking-settings', 'max')
  }
  return doc
}
