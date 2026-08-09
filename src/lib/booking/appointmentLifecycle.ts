export const appointmentStatusValues = [
  'pending_payment',
  'payment_processing',
  'confirmed',
  'expired',
  'cancelled',
  'completed',
  'no_show',
  'payment_failed',
  'payment_received_conflict',
  'refunded',
  'partially_refunded',
] as const

export const appointmentPaymentStatusValues = [
  'unpaid',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
] as const

export type AppointmentStatus = (typeof appointmentStatusValues)[number]
export type AppointmentPaymentStatus = (typeof appointmentPaymentStatusValues)[number]

export type AppointmentLifecycleState = {
  status: AppointmentStatus
  paymentStatus: AppointmentPaymentStatus
}

type AppointmentLifecycleTransition = {
  from: AppointmentLifecycleState
  to: AppointmentLifecycleState
}

const state = (
  status: AppointmentStatus,
  paymentStatus: AppointmentPaymentStatus,
): AppointmentLifecycleState => ({ paymentStatus, status })

export const validAppointmentLifecycleStates: readonly AppointmentLifecycleState[] = [
  state('pending_payment', 'unpaid'),
  state('payment_processing', 'processing'),
  state('confirmed', 'unpaid'),
  state('confirmed', 'paid'),
  state('expired', 'unpaid'),
  state('expired', 'failed'),
  state('cancelled', 'unpaid'),
  state('cancelled', 'processing'),
  state('cancelled', 'paid'),
  state('cancelled', 'failed'),
  state('completed', 'unpaid'),
  state('completed', 'paid'),
  state('completed', 'refunded'),
  state('completed', 'partially_refunded'),
  state('no_show', 'unpaid'),
  state('no_show', 'paid'),
  state('no_show', 'refunded'),
  state('no_show', 'partially_refunded'),
  state('payment_failed', 'failed'),
  state('payment_received_conflict', 'paid'),
  state('refunded', 'refunded'),
  state('partially_refunded', 'partially_refunded'),
]

export const appointmentLifecycleTransitions: readonly AppointmentLifecycleTransition[] = [
  { from: state('pending_payment', 'unpaid'), to: state('payment_processing', 'processing') },
  { from: state('pending_payment', 'unpaid'), to: state('confirmed', 'unpaid') },
  { from: state('pending_payment', 'unpaid'), to: state('cancelled', 'unpaid') },
  { from: state('pending_payment', 'unpaid'), to: state('expired', 'unpaid') },
  { from: state('pending_payment', 'unpaid'), to: state('payment_received_conflict', 'paid') },

  { from: state('payment_processing', 'processing'), to: state('confirmed', 'paid') },
  { from: state('payment_processing', 'processing'), to: state('payment_failed', 'failed') },
  { from: state('payment_processing', 'processing'), to: state('pending_payment', 'unpaid') },
  { from: state('payment_processing', 'processing'), to: state('cancelled', 'processing') },
  { from: state('payment_processing', 'processing'), to: state('payment_received_conflict', 'paid') },

  { from: state('payment_failed', 'failed'), to: state('payment_processing', 'processing') },
  { from: state('payment_failed', 'failed'), to: state('cancelled', 'failed') },
  { from: state('payment_failed', 'failed'), to: state('expired', 'failed') },
  { from: state('payment_failed', 'failed'), to: state('payment_received_conflict', 'paid') },

  { from: state('confirmed', 'unpaid'), to: state('pending_payment', 'unpaid') },
  { from: state('confirmed', 'unpaid'), to: state('cancelled', 'unpaid') },
  { from: state('confirmed', 'unpaid'), to: state('completed', 'unpaid') },
  { from: state('confirmed', 'unpaid'), to: state('no_show', 'unpaid') },
  { from: state('confirmed', 'paid'), to: state('cancelled', 'paid') },
  { from: state('confirmed', 'paid'), to: state('completed', 'paid') },
  { from: state('confirmed', 'paid'), to: state('no_show', 'paid') },
  { from: state('confirmed', 'paid'), to: state('refunded', 'refunded') },
  { from: state('confirmed', 'paid'), to: state('partially_refunded', 'partially_refunded') },

  { from: state('cancelled', 'unpaid'), to: state('pending_payment', 'unpaid') },
  { from: state('cancelled', 'unpaid'), to: state('payment_received_conflict', 'paid') },
  { from: state('cancelled', 'processing'), to: state('payment_processing', 'processing') },
  { from: state('cancelled', 'processing'), to: state('cancelled', 'unpaid') },
  { from: state('cancelled', 'processing'), to: state('cancelled', 'failed') },
  { from: state('cancelled', 'processing'), to: state('payment_received_conflict', 'paid') },
  { from: state('cancelled', 'failed'), to: state('payment_failed', 'failed') },
  { from: state('cancelled', 'failed'), to: state('payment_received_conflict', 'paid') },
  { from: state('cancelled', 'paid'), to: state('confirmed', 'paid') },
  { from: state('cancelled', 'paid'), to: state('refunded', 'refunded') },
  { from: state('cancelled', 'paid'), to: state('partially_refunded', 'partially_refunded') },

  { from: state('expired', 'unpaid'), to: state('payment_received_conflict', 'paid') },
  { from: state('expired', 'failed'), to: state('payment_received_conflict', 'paid') },

  { from: state('completed', 'paid'), to: state('completed', 'refunded') },
  { from: state('completed', 'paid'), to: state('completed', 'partially_refunded') },
  { from: state('completed', 'partially_refunded'), to: state('completed', 'refunded') },
  { from: state('no_show', 'paid'), to: state('no_show', 'refunded') },
  { from: state('no_show', 'paid'), to: state('no_show', 'partially_refunded') },
  { from: state('no_show', 'partially_refunded'), to: state('no_show', 'refunded') },

  { from: state('payment_received_conflict', 'paid'), to: state('confirmed', 'paid') },
  { from: state('payment_received_conflict', 'paid'), to: state('cancelled', 'paid') },
  { from: state('payment_received_conflict', 'paid'), to: state('refunded', 'refunded') },
  {
    from: state('payment_received_conflict', 'paid'),
    to: state('partially_refunded', 'partially_refunded'),
  },
  { from: state('partially_refunded', 'partially_refunded'), to: state('refunded', 'refunded') },
]

const lifecycleKey = ({ paymentStatus, status }: AppointmentLifecycleState): string =>
  `${status}:${paymentStatus}`

const validStateKeys = new Set(validAppointmentLifecycleStates.map(lifecycleKey))
const transitionKeys = new Set(
  appointmentLifecycleTransitions.map(({ from, to }) => `${lifecycleKey(from)}>${lifecycleKey(to)}`),
)

export class AppointmentLifecycleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppointmentLifecycleError'
  }
}

export function isAppointmentLifecycleStateValid(value: AppointmentLifecycleState): boolean {
  return validStateKeys.has(lifecycleKey(value))
}

export function assertAppointmentLifecycleState(value: AppointmentLifecycleState): void {
  if (!isAppointmentLifecycleStateValid(value)) {
    throw new AppointmentLifecycleError(
      `Appointment state ${value.status} is not compatible with payment state ${value.paymentStatus}.`,
    )
  }
}

export function isAppointmentLifecycleTransitionAllowed(
  from: AppointmentLifecycleState,
  to: AppointmentLifecycleState,
): boolean {
  if (lifecycleKey(from) === lifecycleKey(to)) return true
  return transitionKeys.has(`${lifecycleKey(from)}>${lifecycleKey(to)}`)
}

export function assertAppointmentLifecycleTransition(
  from: AppointmentLifecycleState,
  to: AppointmentLifecycleState,
): void {
  assertAppointmentLifecycleState(from)
  assertAppointmentLifecycleState(to)
  if (!isAppointmentLifecycleTransitionAllowed(from, to)) {
    throw new AppointmentLifecycleError(
      `Appointment transition ${lifecycleKey(from)} to ${lifecycleKey(to)} is not allowed.`,
    )
  }
}

export function isAppointmentStatusNonBlocking(status: AppointmentStatus): boolean {
  return [
    'expired',
    'cancelled',
    'completed',
    'no_show',
    'payment_received_conflict',
    'refunded',
    'partially_refunded',
  ].includes(status)
}

export function getReopenedAppointmentStatus(
  paymentStatus: AppointmentPaymentStatus,
): AppointmentStatus | null {
  if (paymentStatus === 'unpaid') return 'pending_payment'
  if (paymentStatus === 'processing') return 'payment_processing'
  if (paymentStatus === 'failed') return 'payment_failed'
  if (paymentStatus === 'paid') return 'confirmed'
  return null
}
