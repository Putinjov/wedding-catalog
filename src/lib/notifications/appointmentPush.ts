import { after } from 'next/server'
import type { CollectionAfterChangeHook, Payload } from 'payload'

import { getServerEnvironment } from '@/config/env'
import type { Appointment, MobileDevice } from '@/payload-types'

export const appointmentPushEventValues = [
  'new_appointment',
  'confirmed',
  'cancelled',
  'rescheduled',
  'admin_review',
] as const

export type AppointmentPushEvent = (typeof appointmentPushEventValues)[number]

type ExpoPushTicket = {
  details?: { error?: string }
  status?: 'error' | 'ok'
}

type PushMessage = {
  badge: 1
  body: string
  channelId: 'appointments'
  data: {
    appointmentId: string
    type: 'appointment'
    url: string
  }
  sound: 'default'
  title: string
  to: string
}

const pushCopy: Record<AppointmentPushEvent, Pick<PushMessage, 'body' | 'title'>> = {
  admin_review: {
    body: 'A booking needs attention. Open the manager app to review it.',
    title: 'Booking needs review',
  },
  cancelled: {
    body: 'An appointment was cancelled. Open the manager app for details.',
    title: 'Appointment cancelled',
  },
  confirmed: {
    body: 'An appointment was confirmed. Open the manager app for details.',
    title: 'Appointment confirmed',
  },
  new_appointment: {
    body: 'A new fitting request was received. Open the manager app for details.',
    title: 'New appointment',
  },
  rescheduled: {
    body: 'An appointment time changed. Open the manager app for details.',
    title: 'Appointment rescheduled',
  },
}

export function getAppointmentPushEvent({
  appointment,
  operation,
  previous,
}: {
  appointment: Appointment
  operation: 'create' | 'update'
  previous?: Appointment | null
}): AppointmentPushEvent | null {
  if (operation === 'create') {
    return appointment.source === 'website' ? 'new_appointment' : null
  }
  if (!previous) return null
  if (appointment.needsAdminReview && !previous.needsAdminReview) return 'admin_review'
  if (appointment.startAt !== previous.startAt || appointment.endAt !== previous.endAt) {
    return 'rescheduled'
  }
  if (appointment.status !== previous.status && appointment.status === 'cancelled') {
    return 'cancelled'
  }
  if (appointment.status !== previous.status && appointment.status === 'confirmed') {
    return 'confirmed'
  }
  return null
}

export function buildAppointmentPushMessage({
  appointmentId,
  event,
  token,
}: {
  appointmentId: Appointment['id']
  event: AppointmentPushEvent
  token: string
}): PushMessage {
  return {
    ...pushCopy[event],
    badge: 1,
    channelId: 'appointments',
    data: {
      appointmentId: String(appointmentId),
      type: 'appointment',
      url: `/appointment/${encodeURIComponent(String(appointmentId))}`,
    },
    sound: 'default',
    to: token,
  }
}

async function disableInvalidDevices(
  payload: Payload,
  devices: MobileDevice[],
  tickets: ExpoPushTicket[],
): Promise<void> {
  const invalid = devices.filter(
    (_device, index) => tickets[index]?.details?.error === 'DeviceNotRegistered',
  )
  await Promise.all(
    invalid.map((device) =>
      payload.update({
        collection: 'mobile-devices',
        id: device.id,
        data: { notificationsEnabled: false },
        depth: 0,
        overrideAccess: true,
      }),
    ),
  )
}

export async function dispatchAppointmentPush({
  appointment,
  event,
  payload,
}: {
  appointment: Appointment
  event: AppointmentPushEvent
  payload: Payload
}): Promise<void> {
  const result = await payload.find({
    collection: 'mobile-devices',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    pagination: false,
    where: { notificationsEnabled: { equals: true } },
  })
  const seen = new Set<string>()
  const devices = result.docs.filter((device) => {
    if (seen.has(device.expoPushToken)) return false
    seen.add(device.expoPushToken)
    return true
  })

  for (let index = 0; index < devices.length; index += 100) {
    const batch = devices.slice(index, index + 100)
    const messages = batch.map((device) =>
      buildAppointmentPushMessage({
        appointmentId: appointment.id,
        event,
        token: device.expoPushToken,
      }),
    )
    const accessToken = getServerEnvironment({ strict: false }).EXPO_ACCESS_TOKEN
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      body: JSON.stringify(messages),
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Expo push service returned HTTP ${response.status}.`)
    }
    const body = (await response.json()) as { data?: ExpoPushTicket[] }
    await disableInvalidDevices(payload, batch, body.data ?? [])
  }
}

export const queueAppointmentPush: CollectionAfterChangeHook<Appointment> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const event = getAppointmentPushEvent({
    appointment: doc,
    operation,
    previous: previousDoc,
  })
  if (!event) return doc

  const send = async () => {
    try {
      await dispatchAppointmentPush({ appointment: doc, event, payload: req.payload })
    } catch (error) {
      req.payload.logger.error({
        appointmentId: String(doc.id),
        errorName: error instanceof Error ? error.name : 'Error',
        event,
        msg: 'Manager push notification could not be delivered.',
      })
    }
  }

  try {
    after(send)
  } catch {
    await send()
  }
  return doc
}
