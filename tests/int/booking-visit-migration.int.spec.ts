import { describe, expect, it, vi } from 'vitest'

import { verifiedBookingVisitDetails } from '@/config/booking'
import { down, up } from '@/migrations/20260819_193000_add_booking_visit_address'

type BookingSettingsFixture = {
  _task25SeededVisitAddress?: boolean
  _task25SeededVisitMapUrl?: boolean
  globalType: string
  visitDetails?: {
    address?: null | string
    mapUrl?: null | string
  }
}

function migrationArgs(existing: BookingSettingsFixture | null) {
  const updateOne = vi.fn(async () => ({ matchedCount: 1 }))
  const findOne = vi.fn(async () => existing)
  const logger = { info: vi.fn() }
  const session = { marker: 'task-25-migration-session' }
  const args = {
    payload: {
      db: {
        globals: {
          collection: { updateOne },
          findOne,
        },
      },
      logger,
    },
    session,
  } as unknown as Parameters<typeof up>[0]

  return { args, findOne, logger, session, updateOne }
}

describe('Task 25 booking visit details migration', () => {
  it('seeds the verified address and map link into empty booking settings', async () => {
    const fixture = migrationArgs({ globalType: 'booking-settings' })

    await up(fixture.args)

    expect(fixture.updateOne).toHaveBeenCalledWith(
      { globalType: 'booking-settings' },
      {
        $set: {
          '_task25SeededVisitAddress': true,
          '_task25SeededVisitMapUrl': true,
          'visitDetails.address': verifiedBookingVisitDetails.address,
          'visitDetails.mapUrl': verifiedBookingVisitDetails.mapUrl,
        },
      },
      { session: fixture.session },
    )
  })

  it('fails closed when an existing address would be overwritten', async () => {
    const fixture = migrationArgs({
      globalType: 'booking-settings',
      visitDetails: { address: 'A different address' },
    })

    await expect(up(fixture.args)).rejects.toThrow(/existing fitting address requires manual review/i)
    expect(fixture.updateOne).not.toHaveBeenCalled()
  })

  it('leaves already verified visit details unchanged', async () => {
    const fixture = migrationArgs({
      globalType: 'booking-settings',
      visitDetails: {
        address: verifiedBookingVisitDetails.address,
        mapUrl: verifiedBookingVisitDetails.mapUrl,
      },
    })

    await up(fixture.args)

    expect(fixture.updateOne).not.toHaveBeenCalled()
    expect(fixture.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ msg: expect.stringMatching(/already exists/i) }),
    )
  })

  it('rolls back only unchanged values marked as migration-owned', async () => {
    const fixture = migrationArgs({
      _task25SeededVisitAddress: true,
      _task25SeededVisitMapUrl: true,
      globalType: 'booking-settings',
      visitDetails: {
        address: verifiedBookingVisitDetails.address,
        mapUrl: verifiedBookingVisitDetails.mapUrl,
      },
    })

    await down(fixture.args)

    expect(fixture.updateOne).toHaveBeenCalledWith(
      { globalType: 'booking-settings' },
      {
        $unset: {
          _task25SeededVisitAddress: '',
          _task25SeededVisitMapUrl: '',
          'visitDetails.address': '',
          'visitDetails.mapUrl': '',
        },
      },
      { session: fixture.session },
    )
  })

  it('blocks rollback after a seeded value has been edited', async () => {
    const fixture = migrationArgs({
      _task25SeededVisitAddress: true,
      globalType: 'booking-settings',
      visitDetails: { address: 'Edited after migration' },
    })

    await expect(down(fixture.args)).rejects.toThrow(/address was edited after migration/i)
    expect(fixture.updateOne).not.toHaveBeenCalled()
  })
})
