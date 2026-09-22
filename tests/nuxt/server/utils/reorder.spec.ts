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
  test('берёт список id из тела запроса', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [3, 1, 2] })).toEqual([3, 1, 2])
  })

  test('числа строками из JSON приводятся к числам', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: ['3', '1'] })).toEqual([3, 1])
  })

  test('мусор среди id отбрасывается, остальной порядок сохраняется', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [1, 'abc', null, 2.5, -4, 0, 2] })).toEqual([1, 2])
  })

  test('пустой массив — допустимое тело, применять просто нечего', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(readOrderIds({ ids: [] })).toEqual([])
  })

  test('тело без массива ids — ошибка 400, а не молчаливый пустой список', async () => {
    const { readOrderIds } = await import('~~/server/utils/reorder')
    expect(() => readOrderIds({})).toThrow()
    expect(() => readOrderIds(null)).toThrow()
    expect(() => readOrderIds({ ids: 5 })).toThrow()
  })
})

describe('applyOrder', () => {
  test('переставляет весь список одним запросом', async () => {
    const { applyOrder } = await import('~~/server/utils/reorder')
    await applyOrder(schema.education, [3, 1, 2])

    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]?.op).toBe('execute')
  })

  test('пустой список не ходит в базу', async () => {
    const { applyOrder } = await import('~~/server/utils/reorder')
    await applyOrder(schema.education, [])

    expect(state.calls).toHaveLength(0)
  })
})
