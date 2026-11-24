import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), slug: 'example' as string | undefined, locale: 'ru' }))
vi.mock('~~/server/db', () => ({ db: { query: { post: { findFirst: mocks.findFirst } } } }))

beforeEach(() => {
  mocks.slug = 'example'
  mocks.locale = 'ru'
  mocks.findFirst.mockReset().mockResolvedValue({
    id: 1, slug: 'example', type: 'project', title_ru: 'Название', title_en: 'Title',
    excerpt_ru: 'Кратко', excerpt_en: 'Summary', text_ru: '<h2>Решение</h2>', text_en: '<h2>Solution</h2>',
    url: 'https://example.com', postTags: [], images: [],
  })
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getRouterParam', () => mocks.slug)
  vi.stubGlobal('getQuery', () => ({ locale: mocks.locale }))
})
afterEach(() => vi.unstubAllGlobals())

async function request() {
  const { default: handler } = await import('~~/server/api/projects/[slug].get')
  return (handler as unknown as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

describe('Публичный API проекта', () => {
  test('ищет только опубликованный проект, не исключая внешний URL', async () => {
    await expect(request()).resolves.toMatchObject({ type: 'project', url: 'https://example.com', title: 'Название', text: '<h2>Решение</h2>' })
    const where = mocks.findFirst.mock.calls[0]![0].where as SQL
    const query = new PgDialect().sqlToQuery(where)
    expect(query.params).toEqual(['example', 'project', true])
    expect(query.sql).toContain('"post"."type" =')
    expect(query.sql).toContain('"post"."is_published" =')
    expect(query.sql).not.toContain('"url"')
  })

  test('возвращает английский текст по locale=en', async () => {
    mocks.locale = 'en'
    await expect(request()).resolves.toMatchObject({ title: 'Title', text: '<h2>Solution</h2>' })
  })

  test('отвечает 404, когда опубликованный проект не найден', async () => {
    mocks.findFirst.mockResolvedValue(undefined)
    await expect(request()).rejects.toMatchObject({ statusCode: 404 })
  })

  test('не скрывает отказ БД под видом отсутствующего проекта', async () => {
    mocks.findFirst.mockRejectedValue(new Error('Database unavailable'))
    await expect(request()).rejects.toThrow('Database unavailable')
  })

  test('не делает запрос без slug', async () => {
    mocks.slug = undefined
    await expect(request()).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  test('зарезервированный пример без opt-in не подменяет БД', async () => {
    mocks.slug = 'preview-personal-site'
    mocks.findFirst.mockResolvedValue(undefined)
    await expect(request()).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.findFirst).toHaveBeenCalledOnce()
  })
})
