import { describe, expect, it, vi } from 'vitest'
import { up } from '@/migrations/20261124_220000_add_retention_cursor_index'

describe('retention cursor index migration', () => {
  it('creates a unique cursor index when the collection does not yet exist', async () => {
    const indexes = vi.fn().mockRejectedValue({ code: 26 })
    const createIndex = vi.fn().mockResolvedValue('key_1')
    await up({ payload: { db: { collections: { 'payload-kv': { collection: { indexes, createIndex } } } } } } as never)
    expect(createIndex).toHaveBeenCalledWith({ key: 1 }, { name: 'key_1', unique: true })
  })
  it('rejects an incompatible existing index', async () => {
    const indexes = vi.fn().mockResolvedValue([{ name: 'key_1', key: { key: 1 }, unique: false }])
    const createIndex = vi.fn()
    await expect(up({ payload: { db: { collections: { 'payload-kv': { collection: { indexes, createIndex } } } } } } as never)).rejects.toThrow(/incompatible/)
    expect(createIndex).not.toHaveBeenCalled()
  })
})
