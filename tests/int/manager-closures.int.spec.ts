import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
import { changeClosures, changeClosuresEndpoint } from '@/BookingSettings/closures'
import { getOpeningHours } from '@/lib/booking/date'
import { defaultBookingSettings } from '@/config/booking'

const range = (startDate: string, endDate = startDate) => ({ startDate, endDate })
describe('Manager calendar closures', () => {
  it('merges overlapping and adjacent closures without mutating stored values', () => {
    const current = [range('2026-10-01', '2026-10-03'), range('2026-10-05', '2026-10-07')]
    expect(changeClosures(current, range('2026-10-04'), true)).toEqual([
      range('2026-10-01', '2026-10-07'),
    ])
    expect(current[0].endDate).toBe('2026-10-03')
  })
  it('reopens a day inside a closure while keeping dates on either side closed', () => {
    expect(changeClosures([range('2026-10-01', '2026-10-10')], range('2026-10-04'), false)).toEqual(
      [range('2026-10-01', '2026-10-03'), range('2026-10-05', '2026-10-10')],
    )
  })
  it('handles leap days and month boundaries', () => {
    expect(
      changeClosures([range('2028-02-27', '2028-03-03')], range('2028-02-29', '2028-03-01'), false),
    ).toEqual([range('2028-02-27', '2028-02-28'), range('2028-03-02', '2028-03-03')])
  })
  it('is idempotent for repeated close and reopen requests', () => {
    const target = range('2026-10-01', '2026-10-10')
    const closed = changeClosures([], target, true)
    expect(changeClosures(closed, target, true)).toEqual(closed)
    expect(changeClosures(changeClosures(closed, target, false), target, false)).toEqual([])
  })
  it('feeds the authoritative availability rules and restores normal hours on reopening', () => {
    const target = range('2026-10-06')
    const closures = changeClosures([], target, true)
    expect(getOpeningHours(target.startDate, { ...defaultBookingSettings, closures })).toBeNull()
    expect(
      getOpeningHours(target.startDate, {
        ...defaultBookingSettings,
        closures: changeClosures(closures, target, false),
      }),
    ).not.toBeNull()
  })
  it.each([
    [null, 401],
    [{ id: 'staff', role: 'staff' }, 403],
  ])('rejects unauthorized changes before reading settings', async (user, status) => {
    const response = await changeClosuresEndpoint.handler({ user } as PayloadRequest)
    expect(response.status).toBe(status)
  })
  it('reopens holidays and splits closures using an authorized transaction', async () => {
    const updateGlobal = vi.fn().mockResolvedValue({})
    const commitTransaction = vi.fn().mockResolvedValue(undefined)
    const req = {
      user: { id: 'manager', role: 'manager' },
      context: {},
      json: async () => ({ startDate: '2026-10-06', endDate: '2026-10-06', closed: false }),
      payload: {
        db: { beginTransaction: vi.fn().mockResolvedValue('tx'), commitTransaction },
        findGlobal: vi
          .fn()
          .mockResolvedValue({
            closures: [range('2026-10-01', '2026-10-10')],
            holidays: [{ date: '2026-10-06' }, { date: '2026-12-25' }],
          }),
        updateGlobal,
      },
    } as unknown as PayloadRequest
    expect((await changeClosuresEndpoint.handler(req)).status).toBe(200)
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        overrideAccess: false,
        data: expect.objectContaining({
          closures: [range('2026-10-01', '2026-10-05'), range('2026-10-07', '2026-10-10')],
          holidays: [{ date: '2026-12-25' }],
        }),
      }),
    )
    expect(commitTransaction).toHaveBeenCalledWith('tx')
  })
  it('rejects impossible dates before accessing the database', async () => {
    const response = await changeClosuresEndpoint.handler({
      user: { id: 'manager', role: 'manager' },
      json: async () => ({ startDate: '2026-02-30', endDate: '2026-03-01', closed: true }),
    } as PayloadRequest)
    expect(response.status).toBe(400)
  })
})
