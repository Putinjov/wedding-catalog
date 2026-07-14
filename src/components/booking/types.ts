import type { BookingPurpose } from '@/config/booking'

export type SelectedDressSummary = {
  id: string
  name: string
  slug: string
  supportsBuy: boolean
  supportsRent: boolean
}

export type PurposeOption = {
  description: string
  label: string
  value: BookingPurpose
}
