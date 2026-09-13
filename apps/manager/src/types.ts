export type EntityId = number | string

export type UserRole = 'manager' | 'owner' | 'staff'

export type ManagerUser = {
  collection: 'users'
  email: string
  id: EntityId
  name?: string | null
  role: UserRole
}

export type BookingPurpose = 'buy' | 'rent' | 'undecided'

export type AppointmentStatus =
  | 'cancelled'
  | 'completed'
  | 'confirmed'
  | 'expired'
  | 'no_show'
  | 'partially_refunded'
  | 'payment_failed'
  | 'payment_processing'
  | 'payment_received_conflict'
  | 'pending_payment'
  | 'refunded'

export type PaymentStatus =
  'failed' | 'paid' | 'partially_refunded' | 'processing' | 'refunded' | 'unpaid'

export type CalendarDress = {
  id: EntityId
  name: string
  slug?: string | null
}

export type CalendarAppointment = {
  customerName: string
  dress?: CalendarDress | null
  endAt: string
  id: EntityId
  needsAdminReview: boolean
  paymentStatus: PaymentStatus
  publicReference: string
  purpose: BookingPurpose
  startAt: string
  status: AppointmentStatus
}

export type AppointmentDetail = CalendarAppointment & {
  amountPaid?: number | null
  capabilities: {
    canEditInternalNotes: boolean
    canRefundPaidConflict: boolean
    canResendConfirmation: boolean
    canReschedule: boolean
    canViewAuditTrail: boolean
    canViewEmailHistory: boolean
  }
  currency: 'EUR'
  email: string
  fittingFee: number
  history: {
    audits: {
      action: string
      actorLabel: string
      id: string
      timestamp: string
    }[]
    emails: {
      event: string
      id: string
      sentAt?: string | null
      status: string
    }[]
  }
  internalNotes?: string | null
  notes?: string | null
  phone: string
  reviewReason?: string | null
  source: 'admin' | 'website'
}

export type ClientDirectoryEntry = {
  email: string
  id: string
  lastAppointmentAt: string | null
  lastPurpose: BookingPurpose
  name: string
  nextAppointmentAt: string | null
  phone: string
  totalAppointments: number
}

export type ClientProfile = ClientDirectoryEntry & {
  appointments: CalendarAppointment[]
}

export type AvailableSlot = {
  endAt: string
  label: string
  startAt: string
  time: string
}

export type BookingSettings = {
  closures?: { startDate: string; endDate: string }[] | null
  holidays?: { date: string }[] | null
  closedWeekdays?: string[] | null
  saturdayHours?: { enabled?: boolean | null } | null
  bookingWindowDays: number
  durationMinutes: number
  timezone: 'Europe/Dublin'
}
