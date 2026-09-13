import type { PayloadRequest, TypedUser } from 'payload'

import type { Appointment } from '@/payload-types'

import { toCalendarAppointment, type CalendarAppointment } from './calendarTypes'
import { AdminAppointmentError } from './getCalendarAppointments'

const MAX_APPOINTMENTS = 1000
const terminalStatuses = new Set<Appointment['status']>([
  'cancelled',
  'completed',
  'expired',
  'no_show',
  'partially_refunded',
  'refunded',
])

export type ClientDirectoryEntry = {
  email: string
  id: string
  lastAppointmentAt: string | null
  lastPurpose: Appointment['purpose']
  name: string
  nextAppointmentAt: string | null
  phone: string
  totalAppointments: number
}

export type ClientProfile = ClientDirectoryEntry & {
  appointments: CalendarAppointment[]
}

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase('en-IE')
}

function timestamp(value: string | null): number {
  return value ? new Date(value).getTime() : Number.NEGATIVE_INFINITY
}

function buildEntry(appointments: Appointment[], now: Date): ClientDirectoryEntry {
  const latest = [...appointments].sort(
    (left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt),
  )[0]
  const upcoming = appointments
    .filter(
      (appointment) =>
        !terminalStatuses.has(appointment.status) && new Date(appointment.startAt) >= now,
    )
    .sort((left, right) => timestamp(left.startAt) - timestamp(right.startAt))[0]
  const previous = appointments
    .filter((appointment) => new Date(appointment.startAt) < now)
    .sort((left, right) => timestamp(right.startAt) - timestamp(left.startAt))[0]

  return {
    email: latest.email,
    id: String(latest.id),
    lastAppointmentAt: previous?.startAt ?? null,
    lastPurpose: latest.purpose,
    name: latest.customerName,
    nextAppointmentAt: upcoming?.startAt ?? null,
    phone: latest.phone,
    totalAppointments: appointments.length,
  }
}

async function getAppointments(req: PayloadRequest, user: TypedUser): Promise<Appointment[]> {
  const result = await req.payload.find({
    collection: 'appointments',
    depth: 1,
    limit: MAX_APPOINTMENTS,
    locale: 'en',
    overrideAccess: false,
    pagination: false,
    req,
    sort: '-updatedAt',
    user,
  })
  return result.docs
}

export async function getClientDirectory({
  limit,
  req,
  search,
  user,
}: {
  limit: number
  req: PayloadRequest
  search: string
  user: TypedUser
}): Promise<ClientDirectoryEntry[]> {
  const appointments = await getAppointments(req, user)
  const grouped = new Map<string, Appointment[]>()
  for (const appointment of appointments) {
    const key = normalizeEmail(appointment.email)
    const group = grouped.get(key) ?? []
    group.push(appointment)
    grouped.set(key, group)
  }

  const query = search.trim().toLocaleLowerCase('en-IE')
  return [...grouped.values()]
    .map((group) => buildEntry(group, new Date()))
    .filter((client) =>
      query
        ? [client.name, client.email, client.phone].some((value) =>
            value.toLocaleLowerCase('en-IE').includes(query),
          )
        : true,
    )
    .sort((left, right) => {
      if (left.nextAppointmentAt && right.nextAppointmentAt) {
        return timestamp(left.nextAppointmentAt) - timestamp(right.nextAppointmentAt)
      }
      if (left.nextAppointmentAt) return -1
      if (right.nextAppointmentAt) return 1
      return timestamp(right.lastAppointmentAt) - timestamp(left.lastAppointmentAt)
    })
    .slice(0, limit)
}

export async function getClientProfile({
  appointmentId,
  req,
  user,
}: {
  appointmentId: string
  req: PayloadRequest
  user: TypedUser
}): Promise<ClientProfile> {
  let seed: Appointment
  try {
    seed = await req.payload.findByID({
      collection: 'appointments',
      id: appointmentId,
      depth: 1,
      locale: 'en',
      overrideAccess: false,
      req,
      user,
    })
  } catch {
    throw new AdminAppointmentError('Client not found.', 404)
  }

  const key = normalizeEmail(seed.email)
  const appointments = (await getAppointments(req, user)).filter(
    (appointment) => normalizeEmail(appointment.email) === key,
  )
  if (!appointments.some((appointment) => String(appointment.id) === String(seed.id))) {
    appointments.push(seed)
  }
  const timeline = appointments
    .flatMap((appointment) => {
      try {
        return [toCalendarAppointment(appointment)]
      } catch {
        return []
      }
    })
    .sort((left, right) => timestamp(right.startAt) - timestamp(left.startAt))

  return {
    ...buildEntry(appointments, new Date()),
    appointments: timeline,
  }
}
