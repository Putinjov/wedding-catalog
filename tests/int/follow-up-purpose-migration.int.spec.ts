import { describe, expect, it, vi } from 'vitest'
import { down, up } from '@/migrations/20261101_120000_add_follow_up_booking_purpose'

function fixture(count: number) {
  const countDocuments = vi.fn(async () => count)
  return {
    countDocuments,
    args: { payload: { db: { collections: { appointments: { collection: { countDocuments } } } }, logger: { info: vi.fn() } }, session: {} } as unknown as Parameters<typeof up>[0],
  }
}

describe('follow-up purpose migration', () => {
  it('checks purposes without rewriting existing appointments', async () => {
    const { args, countDocuments } = fixture(0)
    await up(args)
    expect(countDocuments).toHaveBeenCalledWith({ purpose: { $nin: ['buy', 'rent', 'undecided', 'follow_up'] } }, { session: args.session })
  })
  it('refuses unsupported values and unsafe rollback', async () => {
    await expect(up(fixture(1).args)).rejects.toThrow(/unsupported/)
    await expect(down(fixture(1).args)).rejects.toThrow(/reviewed data plan/)
    await expect(down(fixture(0).args)).resolves.toBeUndefined()
  })
})
