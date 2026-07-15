import type { Endpoint, PayloadRequest, TypedUser } from 'payload'
import { z } from 'zod'

import {
  appointmentStatuses,
  toAppointmentDetail,
  type AppointmentStatus,
} from './calendarTypes'
import {
  createAdminAppointment,
  createAdminAppointmentSchema,
} from './createAdminAppointment'
import {
  AdminAppointmentError,
  getCalendarAppointments,
  parseCalendarRange,
} from './getCalendarAppointments'
import { updateAppointmentStatus } from './updateAppointmentStatus'

const statusUpdateSchema = z.object({
  status: z.enum(appointmentStatuses as [AppointmentStatus, ...AppointmentStatus[]]),
  acknowledgePaidCancellation: z.boolean().optional(),
  acknowledgePaidReopen: z.boolean().optional(),
  allowUnpaidManualConfirmation: z.boolean().optional(),
})

function getAuthenticatedUser(req: PayloadRequest): TypedUser | null {
  return req.user ?? null
}

function unauthorizedResponse() {
  return Response.json({ message: 'Authentication is required.' }, { status: 401 })
}

function getRouteID(req: PayloadRequest): string | null {
  const id = req.routeParams?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

async function getJSONBody(req: PayloadRequest): Promise<unknown> {
  try {
    if (!req.json) throw new Error('Missing JSON parser.')
    return await req.json()
  } catch {
    throw new AdminAppointmentError('A valid JSON body is required.')
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminAppointmentError) {
    return Response.json({ message: error.message }, { status: error.status })
  }

  if (error instanceof z.ZodError) {
    return Response.json(
      { message: error.issues[0]?.message ?? 'Please check the submitted details.' },
      { status: 400 },
    )
  }

  return Response.json({ message: 'The appointment request could not be completed.' }, { status: 500 })
}

const getCalendarEndpoint: Endpoint = {
  path: '/calendar',
  method: 'get',
  handler: async (req) => {
    const user = getAuthenticatedUser(req)
    if (!user) return unauthorizedResponse()

    try {
      if (!req.url) throw new AdminAppointmentError('A valid visible date range is required.')
      const url = new URL(req.url)
      const { from, to } = parseCalendarRange(url.searchParams.get('from'), url.searchParams.get('to'))
      const appointments = await getCalendarAppointments({ payload: req.payload, user, from, to })
      return Response.json({ appointments })
    } catch (error) {
      return errorResponse(error)
    }
  },
}

const updateCalendarStatusEndpoint: Endpoint = {
  path: '/calendar/:id/status',
  method: 'post',
  handler: async (req) => {
    const user = getAuthenticatedUser(req)
    if (!user) return unauthorizedResponse()
    const id = getRouteID(req)
    if (!id) return Response.json({ message: 'Appointment not found.' }, { status: 404 })

    try {
      const input = statusUpdateSchema.parse(await getJSONBody(req))
      const result = await updateAppointmentStatus({
        payload: req.payload,
        user,
        id,
        nextStatus: input.status,
        options: {
          acknowledgePaidCancellation: input.acknowledgePaidCancellation,
          acknowledgePaidReopen: input.acknowledgePaidReopen,
          allowUnpaidManualConfirmation: input.allowUnpaidManualConfirmation,
        },
      })
      return Response.json({
        appointment: toAppointmentDetail(result.appointment),
        warning: result.warning,
      })
    } catch (error) {
      return errorResponse(error)
    }
  },
}

const createCalendarAppointmentEndpoint: Endpoint = {
  path: '/calendar/create',
  method: 'post',
  handler: async (req) => {
    const user = getAuthenticatedUser(req)
    if (!user) return unauthorizedResponse()

    try {
      const input = createAdminAppointmentSchema.parse(await getJSONBody(req))
      const appointment = await createAdminAppointment({ payload: req.payload, user, input })
      return Response.json({ appointment: toAppointmentDetail(appointment) }, { status: 201 })
    } catch (error) {
      return errorResponse(error)
    }
  },
}

const getCalendarAppointmentDetailEndpoint: Endpoint = {
  path: '/calendar/:id',
  method: 'get',
  handler: async (req) => {
    const user = getAuthenticatedUser(req)
    if (!user) return unauthorizedResponse()
    const id = getRouteID(req)
    if (!id) return Response.json({ message: 'Appointment not found.' }, { status: 404 })

    try {
      const appointment = await req.payload.findByID({
        collection: 'appointments',
        id,
        depth: 1,
        locale: 'en',
        overrideAccess: false,
        user,
      })
      return Response.json({ appointment: toAppointmentDetail(appointment) })
    } catch {
      return Response.json({ message: 'Appointment not found.' }, { status: 404 })
    }
  },
}

export const appointmentCalendarEndpoints: Endpoint[] = [
  getCalendarEndpoint,
  updateCalendarStatusEndpoint,
  createCalendarAppointmentEndpoint,
  getCalendarAppointmentDetailEndpoint,
]
