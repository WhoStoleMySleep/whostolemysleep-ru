import { describe, test, expect } from 'vitest'

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
