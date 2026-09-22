import { describe, test, expect, vi, beforeEach } from 'vitest'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import * as schema from '~~/server/db/schema'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

beforeEach(() => {
  plan(state)
})

describe('readOrderIds', () => {
  test('it takes the list of ids from the request body', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [3, 1, 2] })).toEqual([3, 1, 2])
  })

  test('numbers that arrive as JSON strings are coerced to numbers', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: ['3', '1'] })).toEqual([3, 1])
  })

  test('junk among the ids is dropped and the rest of the order is kept', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [1, 'abc', null, 2.5, -4, 0, 2] })).toEqual([1, 2])
  })

  test('an empty array is a valid body, there is simply nothing to apply', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [] })).toEqual([])
  })

  test('a body with no ids array is a 400, not a silent empty list', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(() => readOrderIds({})).toThrow()
    expect(() => readOrderIds(null)).toThrow()
    expect(() => readOrderIds({ ids: 5 })).toThrow()
  })
})

describe('applyOrder', () => {
  test('it reorders the whole list in a single query', async () => {
    const { applyOrder } = await import('~~/server/utils/reorder')
    await applyOrder(schema.education, [3, 1, 2])

    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]?.op).toBe('execute')
  })

  test('an empty list never reaches the database', async () => {
    const { applyOrder } = await import('~~/server/utils/reorder')
    await applyOrder(schema.education, [])

    expect(state.calls).toHaveLength(0)
  })
})
