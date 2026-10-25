import { describe, expect, it, vi } from 'vitest'

import { Customers, preventLinkedCustomerDeletion, validateCustomer } from '@/collections/Customers'
import { validateAppointmentCustomer } from '@/lib/customers/appointmentCustomer'
import { normalizeCustomerEmail } from '@/lib/customers/email'

describe('private customer profile foundation', () => {
  it('normalizes the same identity consistently for profiles and appointments', () => {
    expect(normalizeCustomerEmail('  BRIDE@Example.COM ')).toBe('bride@example.com')
  })

  it('restricts profile access to authenticated appointment staff and writes to managers', () => {
    const access = Customers.access
    const staff = { req: { user: { role: 'staff' } } } as never
    const manager = { req: { user: { role: 'manager' } } } as never
    const anonymous = { req: { user: null } } as never

    expect(access?.read?.(staff)).toBe(true)
    expect(access?.create?.(staff)).toBe(false)
    expect(access?.create?.(manager)).toBe(true)
    expect(access?.read?.(anonymous)).toBe(false)
    expect(access?.delete?.(manager)).toBe(false)
  })

  it('does not let an existing profile identity silently change', () => {
    expect(() =>
      validateCustomer({
        data: { email: 'different@example.test' },
        operation: 'update',
        originalDoc: { email: 'bride@example.test', orderStatus: 'none' },
      } as never),
    ).toThrow(/email cannot be changed/i)
  })

  it('requires a confirmed purchase date before an order is marked as awaiting a dress', () => {
    expect(() =>
      validateCustomer({
        data: { orderStatus: 'awaiting_dress' },
        operation: 'create',
      } as never),
    ).toThrow(/purchase confirmation date/i)
    expect(() =>
      validateCustomer({
        data: { orderStatus: 'awaiting_dress', purchaseConfirmedAt: '2026-10-24T12:00:00.000Z' },
        operation: 'create',
      } as never),
    ).not.toThrow()
    expect(() =>
      validateCustomer({
        data: { purchaseConfirmedAt: null },
        operation: 'update',
        originalDoc: {
          email: 'bride@example.test',
          orderStatus: 'awaiting_dress',
          purchaseConfirmedAt: '2026-10-24T12:00:00.000Z',
        },
      } as never),
    ).toThrow(/purchase confirmation date/i)
    expect(() =>
      validateCustomer({
        data: { orderStatus: 'awaiting_deposit', purchaseConfirmedAt: '2026-10-24T12:00:00.000Z' },
        operation: 'create',
      } as never),
    ).toThrow(/confirmed order status/i)
  })

  it('rejects a mismatched appointment link without exposing either email in the error', async () => {
    const findByID = vi.fn(async () => ({ email: 'other@example.test' }))
    await expect(
      validateAppointmentCustomer({
        data: { customer: 'customer-id', email: 'bride@example.test' },
        req: { payload: { findByID } },
      } as never),
    ).rejects.toThrow('The customer profile must match the appointment email.')
    expect(findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'customers',
        depth: 0,
        overrideAccess: true,
      }),
    )
  })

  it('does not disguise a database failure as an invalid customer link', async () => {
    const failure = new Error('Database unavailable')
    await expect(
      validateAppointmentCustomer({
        data: { customer: 'customer-id', email: 'bride@example.test' },
        req: {
          payload: {
            findByID: vi.fn(async () => {
              throw failure
            }),
          },
        },
      } as never),
    ).rejects.toBe(failure)
  })

  it('allows explicit unlinking and refuses to delete a profile with linked appointments', async () => {
    const findByID = vi.fn()
    await expect(
      validateAppointmentCustomer({
        data: { customer: null },
        originalDoc: { customer: 'customer-id', email: 'bride@example.test' },
        req: { payload: { findByID } },
      } as never),
    ).resolves.toEqual({ customer: null })
    expect(findByID).not.toHaveBeenCalled()

    await expect(
      preventLinkedCustomerDeletion({
        id: 'customer-id',
        req: { payload: { count: vi.fn(async () => ({ totalDocs: 1 })) } },
      } as never),
    ).rejects.toThrow(/unlink appointments/i)
  })

  it('requires every new website appointment to link a verified profile', async () => {
    await expect(validateAppointmentCustomer({
      data: { email: 'bride@example.test', source: 'website' },
      operation: 'create',
    } as never)).rejects.toThrow(/verified customer profile/i)
  })

  it('rechecks purchase and fee at the appointment write boundary', async () => {
    const customer: { email: string; id: string; purchaseConfirmedAt: string | null } = {
      id: 'customer-id',
      email: 'bride@example.test',
      purchaseConfirmedAt: '2026-10-24T12:00:00.000Z',
    }
    const findByID = vi.fn(async () => customer)
    const find = vi.fn(async () => ({ docs: [customer] }))
    const input = {
      data: {
        customer: customer.id,
        email: customer.email,
        fittingFee: 0,
        source: 'website',
        startAt: '2099-01-02T10:00:00.000Z',
      },
      operation: 'create',
      req: { payload: { find, findByID } },
    }
    await expect(validateAppointmentCustomer(input as never)).rejects.toThrow(/confirmed purchase/i)

    const noPurchase = { ...customer, purchaseConfirmedAt: null }
    findByID.mockResolvedValue(noPurchase)
    find.mockReset()
      .mockResolvedValueOnce({ docs: [noPurchase] })
      .mockResolvedValueOnce({ docs: [] })
    await expect(validateAppointmentCustomer({
      ...input,
      data: { ...input.data, fittingFee: 1 },
    } as never)).rejects.toThrow(/fitting fee changed/i)
  })
})
