import { APIError, type GlobalConfig } from 'payload'

import { ownerOrManager } from '@/access/roles'
import { BOOKING_TIMEZONE, defaultBookingSettings } from '@/config/booking'
import { validateBookingSettings } from '@/lib/booking/settings'

import { revalidateBookingSettings } from './hooks/revalidateBookingSettings'

const weekdayOptions = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
]

const timeField = (name: 'end' | 'start', label: string) => ({
  name,
  type: 'text' as const,
  label,
  required: true,
  validate: (value: null | string | undefined) =>
    typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
      ? true
      : 'Use 24-hour HH:mm format.',
})

const dateField = (name: 'date' | 'endDate' | 'startDate', label: string) => ({
  name,
  type: 'text' as const,
  label,
  required: true,
  admin: { placeholder: 'YYYY-MM-DD' },
  validate: (value: null | string | undefined) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'Use YYYY-MM-DD format.'
    }
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
      ? true
      : 'Enter a valid calendar date.'
  },
})

export const BookingSettings: GlobalConfig = {
  slug: 'booking-settings',
  label: 'Booking settings',
  access: {
    read: () => true,
    update: ownerOrManager,
  },
  admin: {
    description: 'Authoritative fitting schedule and availability rules. Times use Europe/Dublin.',
    group: 'Bookings',
  },
  fields: [
    {
      name: 'timezone',
      type: 'select',
      defaultValue: BOOKING_TIMEZONE,
      required: true,
      options: [{ label: 'Europe/Dublin', value: BOOKING_TIMEZONE }],
    },
    {
      name: 'durationMinutes',
      type: 'number',
      defaultValue: defaultBookingSettings.durationMinutes,
      min: 15,
      max: 240,
      required: true,
    },
    {
      name: 'holdMinutes',
      type: 'number',
      defaultValue: defaultBookingSettings.holdMinutes,
      min: 5,
      max: 120,
      required: true,
    },
    {
      name: 'bookingWindowDays',
      type: 'number',
      defaultValue: defaultBookingSettings.bookingWindowDays,
      min: 1,
      max: 365,
      required: true,
    },
    {
      name: 'minimumNoticeHours',
      type: 'number',
      defaultValue: defaultBookingSettings.minimumNoticeHours,
      min: 0,
      max: 720,
      required: true,
      admin: { description: 'Stored for Task 19 enforcement.' },
    },
    {
      name: 'nextDayCutoffTime',
      type: 'text',
      admin: {
        description: 'Optional Europe/Dublin cutoff in HH:mm. Stored for Task 19 enforcement.',
        placeholder: 'HH:mm',
      },
      validate: (value: null | string | undefined) =>
        value == null || value === '' || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
          ? true
          : 'Use 24-hour HH:mm format.',
    },
    {
      name: 'closedWeekdays',
      type: 'select',
      defaultValue: ['0', '1'],
      hasMany: true,
      options: weekdayOptions,
      required: true,
    },
    {
      name: 'weekdayHours',
      type: 'group',
      fields: [
        { ...timeField('start', 'Opening time'), defaultValue: defaultBookingSettings.weekdayHours.start },
        { ...timeField('end', 'Closing time'), defaultValue: defaultBookingSettings.weekdayHours.end },
      ],
    },
    {
      name: 'saturdayHours',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true, required: true },
        { ...timeField('start', 'Opening time'), defaultValue: defaultBookingSettings.saturdayHours.start },
        { ...timeField('end', 'Closing time'), defaultValue: defaultBookingSettings.saturdayHours.end },
      ],
    },
    {
      name: 'lunchBreaks',
      type: 'array',
      maxRows: 20,
      fields: [
        { name: 'weekdays', type: 'select', hasMany: true, options: weekdayOptions, required: true },
        timeField('start', 'Start'),
        timeField('end', 'End'),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'bufferBeforeMinutes',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 180,
          required: true,
        },
        {
          name: 'bufferAfterMinutes',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 180,
          required: true,
        },
      ],
    },
    {
      name: 'holidays',
      type: 'array',
      maxRows: 200,
      fields: [dateField('date', 'Date')],
    },
    {
      name: 'closures',
      type: 'array',
      maxRows: 100,
      fields: [dateField('startDate', 'Start date'), dateField('endDate', 'End date')],
    },
    {
      name: 'blockedIntervals',
      type: 'array',
      maxRows: 250,
      fields: [dateField('date', 'Date'), timeField('start', 'Start'), timeField('end', 'End')],
    },
  ],
  hooks: {
    afterChange: [revalidateBookingSettings],
    beforeValidate: [
      ({ data }) => {
        const result = validateBookingSettings(data)
        if (result !== true) throw new APIError(result, 400)
        return data
      },
    ],
  },
}
