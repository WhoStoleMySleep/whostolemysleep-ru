import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-22T00:00:00Z'))
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Стаж для главной в настройках сайта', () => {
  test('суммирует все работы без пауз и пересечений, а не время с первой даты', async () => {
    plan(state, {
      'select:settings': [[{ email: 'mail@example.com' }]],
      'select:experience': [[
        { date_from: '2010-01-01', date_to: '2010-12-31' },
        { date_from: '2024-01-01', date_to: '2025-12-31' },
        { date_from: '2025-01-01', date_to: '2025-12-31' },
      ]],
    })
    const { default: handler } = await import('~~/server/api/settings.get')
    const result = await (handler as (event: H3Event) => Promise<{ years_experience: number }>)({} as H3Event)
    expect(result.years_experience).toBe(3)
    expect(stepArg(state.calls, 'select:experience', 'limit')).toBeUndefined()
  })

  test('не подставляет вымышленные пять лет без записей опыта', async () => {
    plan(state)
    const { default: handler } = await import('~~/server/api/settings.get')
    expect(await (handler as (event: H3Event) => Promise<unknown>)({} as H3Event)).toMatchObject({ years_experience: 0 })
  })
})
