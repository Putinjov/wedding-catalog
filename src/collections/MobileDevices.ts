import type { CollectionConfig, Endpoint, PayloadRequest, TypedUser } from 'payload'
import { z } from 'zod'

import { appointmentTeam, ownerOnly } from '@/access/roles'

const systemOnly = () => false

const deviceRegistrationSchema = z.object({
  deviceName: z.string().trim().max(120).optional(),
  platform: z.enum(['android', 'ios']),
  token: z.string().trim().max(200).refine(isExpoPushToken, 'Invalid Expo push token.'),
})

function isAuthenticatedAppointmentUser(req: PayloadRequest): req is PayloadRequest & {
  user: TypedUser
} {
  return Boolean(req.user && appointmentTeam({ req }))
}

function unauthorizedResponse(): Response {
  return Response.json({ message: 'Authentication is required.' }, { status: 401 })
}

async function readRegistration(req: PayloadRequest) {
  try {
    if (!req.json) throw new Error('Missing JSON parser.')
    return deviceRegistrationSchema.parse(await req.json())
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: error.issues[0]?.message ?? 'Invalid device registration.' },
        { status: 400 },
      )
    }
    return Response.json({ message: 'A valid JSON body is required.' }, { status: 400 })
  }
}

export function isExpoPushToken(value: string): boolean {
  return /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value)
}

const registerDeviceEndpoint: Endpoint = {
  path: '/register',
  method: 'post',
  handler: async (req) => {
    if (!isAuthenticatedAppointmentUser(req)) return unauthorizedResponse()
    const input = await readRegistration(req)
    if (input instanceof Response) return input

    const existing = await req.payload.find({
      collection: 'mobile-devices',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: { expoPushToken: { equals: input.token } },
    })
    const data = {
      deviceName: input.deviceName || undefined,
      expoPushToken: input.token,
      lastSeenAt: new Date().toISOString(),
      notificationsEnabled: true,
      platform: input.platform,
      user: req.user.id,
    }

    if (existing.docs[0]) {
      await req.payload.update({
        collection: 'mobile-devices',
        id: existing.docs[0].id,
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    } else {
      await req.payload.create({
        collection: 'mobile-devices',
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    }

    return Response.json({ registered: true })
  },
}

const unregisterDeviceEndpoint: Endpoint = {
  path: '/unregister',
  method: 'post',
  handler: async (req) => {
    if (!isAuthenticatedAppointmentUser(req)) return unauthorizedResponse()
    const input = await readRegistration(req)
    if (input instanceof Response) return input

    const matches = await req.payload.find({
      collection: 'mobile-devices',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { expoPushToken: { equals: input.token } },
          { user: { equals: req.user.id } },
        ],
      },
    })

    await Promise.all(
      matches.docs.map((device) =>
        req.payload.delete({
          collection: 'mobile-devices',
          id: device.id,
          depth: 0,
          overrideAccess: true,
          req,
        }),
      ),
    )
    return Response.json({ registered: false })
  },
}

export const MobileDevices: CollectionConfig = {
  slug: 'mobile-devices',
  access: {
    admin: ownerOnly,
    create: systemOnly,
    delete: systemOnly,
    read: ownerOnly,
    update: systemOnly,
  },
  admin: {
    defaultColumns: ['deviceName', 'platform', 'user', 'notificationsEnabled', 'lastSeenAt'],
    description: 'Manager app installations registered for privacy-minimised push alerts.',
    group: 'System',
    useAsTitle: 'deviceName',
  },
  endpoints: [registerDeviceEndpoint, unregisterDeviceEndpoint],
  fields: [
    {
      name: 'user',
      type: 'relationship',
      index: true,
      relationTo: 'users',
      required: true,
    },
    {
      name: 'expoPushToken',
      type: 'text',
      index: true,
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    {
      name: 'platform',
      type: 'select',
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
      ],
      required: true,
    },
    {
      name: 'deviceName',
      type: 'text',
      maxLength: 120,
    },
    {
      name: 'notificationsEnabled',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      required: true,
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      index: true,
      required: true,
    },
  ],
  timestamps: true,
}
