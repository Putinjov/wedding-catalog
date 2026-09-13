import type { AppointmentStatus, BookingPurpose, PaymentStatus } from '@/types'

export const purposeLabels: Record<BookingPurpose, string> = {
  buy: 'Buy a dress',
  rent: 'Rent a dress',
  undecided: 'Not decided',
}

export const statusLabels: Record<AppointmentStatus, string> = {
  cancelled: 'Cancelled',
  completed: 'Completed',
  confirmed: 'Confirmed',
  expired: 'Expired',
  no_show: 'No-show',
  partially_refunded: 'Partially refunded',
  payment_failed: 'Payment failed',
  payment_processing: 'Payment processing',
  payment_received_conflict: 'Needs review',
  pending_payment: 'Pending payment',
  refunded: 'Refunded',
}

export const paymentLabels: Record<PaymentStatus, string> = {
  failed: 'Failed',
  paid: 'Paid',
  partially_refunded: 'Partly refunded',
  processing: 'Processing',
  refunded: 'Refunded',
  unpaid: 'Unpaid',
}
