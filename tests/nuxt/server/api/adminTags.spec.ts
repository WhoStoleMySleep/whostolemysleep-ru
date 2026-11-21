import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

async function create(body: unknown) {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => body)
  const mod = await import('~~/server/api/admin/tags.post')
  return (mod.default as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

beforeEach(() => {
  plan(state, { 'insert:tag': [[{ id: 5, slug: 'nuxt', name_ru: 'Nuxt', name_en: 'Nuxt' }]] })
})
afterEach(() => vi.unstubAllGlobals())

describe('Создание тегов', () => {
  test('убирает пробелы и генерирует slug из русского названия', async () => {
    await create({ name_ru: '  Веб разработка  ', name_en: ' Web development ' })
    expect(stepArg(state.calls, 'insert:tag', 'values')).toEqual({
      slug: 'veb-razrabotka', name_ru: 'Веб разработка', name_en: 'Web development',
    })
  })

  test('английское название необязательно', async () => {
    await create({ name_ru: 'Nuxt' })
    expect(stepArg<Record<string, string>>(state.calls, 'insert:tag', 'values')?.name_en).toBe('')
  })

  test.each([null, {}, { name_ru: '  ' }, { name_ru: 5 }, { name_ru: '💤' }, { name_ru: 'a'.repeat(101) }, { name_ru: 'Nuxt', name_en: 'a'.repeat(101) }])('отклоняет некорректные названия: %j', async (body) => {
    await expect(create(body)).rejects.toMatchObject({ statusCode: 400 })
    expect(state.calls).toHaveLength(0)
  })

  test('принимает названия длиной ровно 100 символов', async () => {
    await create({ name_ru: 'a'.repeat(100), name_en: 'b'.repeat(100) })
    expect(stepArg<Record<string, string>>(state.calls, 'insert:tag', 'values')?.slug).toHaveLength(100)
  })

  test('одинаковый slug не создаёт дубликат и возвращает понятный конфликт', async () => {
    plan(state)
    await expect(create({ name_ru: 'Nuxt' })).rejects.toMatchObject({ statusCode: 409 })
    expect(state.calls[0]?.steps.some(s => s.m === 'onConflictDoNothing')).toBe(true)
  })
})


test.each([['C++', 'c-plus-plus'], ['C#', 'c-sharp'], ['C', 'c']])('позволяет создать %s с отдельным slug %s', async (name_ru, slug) => {
  await create({ name_ru, slug })
  expect(stepArg(state.calls, 'insert:tag', 'values')).toEqual({ name_ru, name_en: '', slug })
})

test.each(['C#', 'UPPER', 'a b', '-start', 'end-', 'a'.repeat(101)])('отклоняет некорректный явный slug %s', async (slug) => {
  await expect(create({ name_ru: 'Nuxt', slug })).rejects.toMatchObject({ statusCode: 400 })
})
