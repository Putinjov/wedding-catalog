import Constants from 'expo-constants'

import type {
  AppointmentDetail,
  AppointmentStatus,
  AvailableSlot,
  BookingPurpose,
  BookingSettings,
  CalendarAppointment,
  ClientDirectoryEntry,
  ClientProfile,
  ManagerUser,
} from '@/types'

const configuredOrigin =
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof Constants.expoConfig?.extra?.apiUrl === 'string'
    ? Constants.expoConfig.extra.apiUrl
    : 'https://caitbridal.ie')

export const apiOrigin = configuredOrigin.replace(/\/$/, '')

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
  token?: string
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options
  let response: Response
  try {
    response = await fetch(`${apiOrigin}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `JWT ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('Cannot reach CAIT Bridal. Check your connection and try again.', 0)
  }

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    if (!response.ok)
      throw new ApiError('The server returned an unexpected response.', response.status)
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'The request could not be completed.'
    throw new ApiError(message, response.status)
  }
  return body as T
}

export type AuthSession = {
  exp?: number
  token: string
  user: ManagerUser
}

function isManagerUser(value: unknown): value is ManagerUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return (
    (typeof user.id === 'string' || typeof user.id === 'number') &&
    typeof user.email === 'string' &&
    (user.role === 'owner' || user.role === 'manager' || user.role === 'staff')
  )
}

function requireSession(result: {
  exp?: number
  refreshedToken?: string
  token?: string
  user?: unknown
}): AuthSession {
  const token = result.token ?? result.refreshedToken
  if (!token || !isManagerUser(result.user)) {
    throw new ApiError('The server did not return a usable staff session.', 500)
  }
  return { exp: result.exp, token, user: result.user }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const result = await apiRequest<{
    exp?: number
    token?: string
    user?: unknown
  }>('/api/users/login', {
    body: JSON.stringify({ email: email.trim(), password }),
    method: 'POST',
  })
  return requireSession(result)
}

export async function refreshSession(token: string): Promise<AuthSession> {
  const result = await apiRequest<{
    exp?: number
    refreshedToken?: string
    user?: unknown
  }>('/api/users/refresh-token', { method: 'POST', token })
  return requireSession(result)
}

export async function getMe(token: string): Promise<{ user: ManagerUser | null }> {
  return apiRequest('/api/users/me?depth=0', { token })
}

export async function getCalendar(
  token: string,
  fromDate: string,
  toDate: string,
): Promise<CalendarAppointment[]> {
  const query = new URLSearchParams({ from: fromDate, to: toDate })
  const result = await apiRequest<{ appointments: CalendarAppointment[] }>(
    `/api/appointments/calendar?${query}`,
    { token },
  )
  return result.appointments
}

export async function getAppointment(token: string, id: string): Promise<AppointmentDetail> {
  const result = await apiRequest<{ appointment: AppointmentDetail }>(
    `/api/appointments/calendar/${encodeURIComponent(id)}`,
    { token },
  )
  return result.appointment
}

export async function updateAppointmentStatus(
  token: string,
  id: string,
  input: {
    acknowledgePaidCancellation?: boolean
    acknowledgePaidReopen?: boolean
    allowUnpaidManualConfirmation?: boolean
    status: AppointmentStatus
  },
): Promise<AppointmentDetail> {
  const result = await apiRequest<{ appointment: AppointmentDetail }>(
    `/api/appointments/calendar/${encodeURIComponent(id)}/status`,
    { body: JSON.stringify(input), method: 'POST', token },
  )
  return result.appointment
}

export async function updateAppointmentNotes(
  token: string,
  id: string,
  internalNotes: string,
  operationKey: string,
): Promise<AppointmentDetail> {
  const result = await apiRequest<{ appointment: AppointmentDetail }>(
    `/api/appointments/calendar/${encodeURIComponent(id)}/notes`,
    {
      body: JSON.stringify({ internalNotes, operationKey }),
      method: 'POST',
      token,
    },
  )
  return result.appointment
}

export async function getAvailableSlots(
  token: string,
  date: string,
  options: { allowNoticeOverride?: boolean; excludeId?: string } = {},
): Promise<{ durationMinutes: number; slots: AvailableSlot[]; timezone: string }> {
  const query = new URLSearchParams({ date })
  if (options.allowNoticeOverride) query.set('allowNoticeOverride', 'true')
  if (options.excludeId) query.set('excludeId', options.excludeId)
  return apiRequest(`/api/appointments/calendar/slots?${query}`, { token })
}

export async function rescheduleAppointment(
  token: string,
  id: string,
  input: {
    allowNoticeOverride?: boolean
    date: string
    operationKey: string
    time: string
  },
): Promise<AppointmentDetail> {
  const result = await apiRequest<{ appointment: AppointmentDetail }>(
    `/api/appointments/calendar/${encodeURIComponent(id)}/reschedule`,
    { body: JSON.stringify(input), method: 'POST', token },
  )
  return result.appointment
}

export type CreateAppointmentInput = {
  allowUnpaidManualConfirmation?: boolean
  customerName: string
  date: string
  email: string
  initialStatus: 'confirmed' | 'pending_payment'
  notes?: string
  overrideNoticeRules?: boolean
  phone: string
  privacyNoticeMethod: 'email' | 'in_person' | 'phone' | 'sms'
  purpose: BookingPurpose
  time: string
}

export async function createAppointment(
  token: string,
  input: CreateAppointmentInput,
): Promise<AppointmentDetail> {
  const result = await apiRequest<{ appointment: AppointmentDetail }>(
    '/api/appointments/calendar/create',
    { body: JSON.stringify(input), method: 'POST', token },
  )
  return result.appointment
}

export async function getBookingSettings(token: string): Promise<BookingSettings> {
  return apiRequest('/api/globals/booking-settings?depth=0', { token })
}

export async function getClients(token: string, search: string): Promise<ClientDirectoryEntry[]> {
  const query = new URLSearchParams({ limit: '100' })
  if (search.trim()) query.set('search', search.trim())
  const result = await apiRequest<{ clients: ClientDirectoryEntry[] }>(
    `/api/appointments/clients?${query}`,
    { token },
  )
  return result.clients
}

export async function getClient(token: string, id: string): Promise<ClientProfile> {
  const result = await apiRequest<{ client: ClientProfile }>(
    `/api/appointments/clients/${encodeURIComponent(id)}`,
    { token },
  )
  return result.client
}

export type DeviceRegistration = {
  deviceName?: string
  platform: 'android' | 'ios'
  token: string
}

export async function registerDevice(
  authToken: string,
  registration: DeviceRegistration,
): Promise<void> {
  await apiRequest('/api/mobile-devices/register', {
    body: JSON.stringify(registration),
    method: 'POST',
    token: authToken,
  })
}

export async function unregisterDevice(
  authToken: string,
  registration: DeviceRegistration,
): Promise<void> {
  await apiRequest('/api/mobile-devices/unregister', {
    body: JSON.stringify(registration),
    method: 'POST',
    token: authToken,
  })
}

export async function changeBookingClosures(
  token: string,
  startDate: string,
  endDate: string,
  closed: boolean,
): Promise<void> {
  await apiRequest('/api/globals/booking-settings/closures', {
    token,
    method: 'POST',
    body: JSON.stringify({ startDate, endDate, closed }),
  })
}
