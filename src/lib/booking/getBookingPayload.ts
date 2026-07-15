import configPromise from '@payload-config'
import { getPayload } from 'payload'

export function getBookingPayload() {
  return getPayload({ config: configPromise })
}
