import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  const db = makeFakeDb(state) as object
  return { db: { ...db, query: { tag: { findFirst: async ({ where }: { where: SQL }) => {
    const query = new PgDialect().sqlToQuery(where)
    const wanted = String(query.params[0]).toLocaleLowerCase('ru')
    const rows = (state.rows?.tag ?? []) as { name_ru: string; slug: string }[]
    return rows.find(row => (query.sql.includes('lower(trim(') ? row.name_ru.toLocaleLowerCase('ru') : row.slug) === wanted)
  } } }, insert: (...args: unknown[]) => (db as { insert: (...args: unknown[]) => unknown }).insert(...args) } }

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
    await expect(create({ name_ru: 'Nuxt', slug: 'nuxt' })).rejects.toMatchObject({ statusCode: 409 })
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


test('C++ и C# получают разные slug без ручного ввода', async () => {
  const existing = { id: 1, slug: 'c', name_ru: 'C++', name_en: '' }
  const created = { id: 2, slug: 'unique', name_ru: 'C#', name_en: '' }
  plan(state, { 'insert:tag': [[], [created]] }, { tag: [existing] })
  expect(await create({ name_ru: 'C#' })).toEqual(created)
  const second = stepArg<Record<string, string>>(state.calls, 'insert:tag', 'values', 1)
  expect(second?.slug).toMatch(/^c-[a-f0-9]{10}$/)
})

test('повторное создание того же названия возвращает существующий тег', async () => {
  const existing = { id: 1, slug: 'nuxt', name_ru: 'Nuxt', name_en: '' }
  plan(state, { 'insert:tag': [[]] }, { tag: [existing] })
  expect(await create({ name_ru: 'nuxt' })).toEqual(existing)
  expect(state.calls).toHaveLength(0)
})

test('суффикс коллизии стабилен и не превышает лимит slug', async () => {
  const name_ru = 'a'.repeat(100)
  const existing = { id: 1, slug: name_ru, name_ru: `${name_ru}++`, name_en: '' }
  const created = { id: 2, slug: 'unique', name_ru, name_en: '' }
  plan(state, { 'insert:tag': [[], [created]] }, { tag: [existing] })
  await create({ name_ru })
  const slug = stepArg<Record<string, string>>(state.calls, 'insert:tag', 'values', 1)?.slug
  expect(slug).toHaveLength(100)
})


test('длинная транслитерация обрезается автоматически в пределах лимита slug', async () => {
  await create({ name_ru: 'ж'.repeat(51) })
  expect(stepArg<Record<string, string>>(state.calls, 'insert:tag', 'values')?.slug).toHaveLength(100)
})

test('существующий тег с ручным slug находится по названию до вставки', async () => {
  const existing = { id: 3, slug: 'c-plus-plus', name_ru: 'C++', name_en: '' }
  plan(state, {}, { tag: [existing] })
  expect(await create({ name_ru: ' C++ ' })).toEqual(existing)
  expect(state.calls).toHaveLength(0)
})

test('не скрывает повторную коллизию автоматически сгенерированного slug', async () => {
  plan(state, { 'insert:tag': [[], []] })
  await expect(create({ name_ru: 'Nuxt' })).rejects.toMatchObject({ statusCode: 409, message: 'Could not create a unique tag — retry' })
  expect(state.calls.filter(call => call.op === 'insert')).toHaveLength(2)
})
