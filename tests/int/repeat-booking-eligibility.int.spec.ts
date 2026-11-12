import { describe, expect, it, vi } from 'vitest'

import {
  getTwoYearAnniversary,
  isWithinRepeatBookingWindow,
  resolveRepeatBookingDecision,
} from '@/lib/customers/repeatBooking'

describe('repeat booking eligibility', () => {
  it('includes the Dublin-local second anniversary and excludes the next day', () => {
    const completed = new Date('2024-10-26T23:30:00.000Z') // 27 October in Dublin
    expect(isWithinRepeatBookingWindow(completed, new Date('2026-10-27T12:00:00.000Z'))).toBe(true)
    expect(isWithinRepeatBookingWindow(completed, new Date('2026-10-28T12:00:00.000Z'))).toBe(false)
  })

  it('handles spring and autumn clock changes as local calendar dates', () => {
    const completed = new Date('2024-03-31T09:00:00.000Z')
    expect(isWithinRepeatBookingWindow(completed, new Date('2026-03-31T09:00:00.000Z'))).toBe(true)
    expect(isWithinRepeatBookingWindow(completed, new Date('2026-04-01T09:00:00.000Z'))).toBe(false)
  })

  it('includes 28 February after a leap-day visit but excludes 1 March', () => {
    expect(getTwoYearAnniversary('2028-02-29')).toBe('2030-02-28')
    const completed = new Date('2028-02-29T11:00:00.000Z')
    expect(isWithinRepeatBookingWindow(completed, new Date('2030-02-28T12:00:00.000Z'))).toBe(true)
    expect(isWithinRepeatBookingWindow(completed, new Date('2030-03-01T12:00:00.000Z'))).toBe(false)
  })

  it('refuses a free booking before the completed appointment or for invalid dates', () => {
    const completed = new Date('2026-10-25T12:00:00.000Z')
    expect(isWithinRepeatBookingWindow(completed, completed)).toBe(false)
    expect(isWithinRepeatBookingWindow(completed, new Date('invalid'))).toBe(false)
  })

  it('requires a linked, genuinely completed visit and respects a confirmed purchase', async () => {
    const customer = { id: 'customer-1', email: 'bride@example.com', purchaseConfirmedAt: null }
    const find = vi.fn()
      .mockResolvedValueOnce({ docs: [customer] })
      .mockResolvedValueOnce({ docs: [{ startAt: '2026-10-01T11:00:00.000Z' }] })
    const now = new Date('2026-10-25T12:00:00.000Z')
    const requestedAt = new Date('2026-10-30T11:00:00.000Z')
    const decision = await resolveRepeatBookingDecision({
      email: 'BRIDE@example.com', now, payload: { find } as never, requestedAt,
    })
    expect(decision.kind).toBe('free')
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({
      collection: 'appointments',
      limit: 1,
      sort: '-startAt',
      where: { and: [
        { customer: { equals: customer.id } },
        { status: { equals: 'completed' } },
        { endAt: { less_than_equal: now.toISOString() } },
        { startAt: { less_than: requestedAt.toISOString() } },
      ] },
    }))

    find.mockReset().mockResolvedValueOnce({ docs: [{ ...customer, purchaseConfirmedAt: now.toISOString() }] })
    expect((await resolveRepeatBookingDecision({
      email: customer.email, now, payload: { find } as never, requestedAt,
    })).kind).toBe('closed')
    expect(find).toHaveBeenCalledTimes(1)
  })

  it('does not infer historical ownership from a matching email alone', async () => {
    const find = vi.fn()
      .mockResolvedValueOnce({ docs: [{ id: 'customer-1', email: 'bride@example.com' }] })
      .mockResolvedValueOnce({ docs: [] })
    const decision = await resolveRepeatBookingDecision({
      email: 'bride@example.com',
      now: new Date('2026-10-25T12:00:00.000Z'),
      payload: { find } as never,
      requestedAt: new Date('2026-10-30T11:00:00.000Z'),
    })
    expect(decision.kind).toBe('standard')
  })
})
