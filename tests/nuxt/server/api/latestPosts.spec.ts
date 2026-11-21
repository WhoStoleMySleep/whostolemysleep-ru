import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

const m = vi.hoisted(() => ({
  findMany: vi.fn(async (_query: unknown): Promise<unknown[]> => []),
  locale:   'ru',
}))

vi.mock('~~/server/db', () => ({ db: { query: { post: { findMany: m.findMany } } } }))

async function latest() {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getQuery', () => ({ locale: m.locale }))
  const mod = await import('~~/server/api/posts/latest.get')
  return mod.default as unknown as ((e: H3Event) => Promise<unknown[]>)
}

beforeEach(() => {
  m.findMany.mockClear().mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/posts/latest', () => {
  test('запрашивает не более восьми проектов без тела записи', async () => {
    const handler = await latest()
    await handler({} as H3Event)

    const query = m.findMany.mock.calls[0]?.[0] as { limit: number, columns: Record<string, boolean> }
    expect(query.limit).toBe(8)
    expect(query.columns).toEqual({ text_ru: false, text_en: false })
    expect(query).not.toHaveProperty('with')
  })

  test('неизвестная локаль использует русский перевод', async () => {
    const handler = await latest()
    m.findMany.mockResolvedValueOnce([{
      id: 1, slug: 'recent', type: 'project', title_ru: 'Русский', title_en: 'English',
      excerpt_ru: '', excerpt_en: '', url: null, is_pinned: false,
      published_at: '2026-11-01', updated_at: '2026-11-01',
    }])
    m.locale = 'xyz123'
    expect(await handler({} as H3Event)).toEqual([expect.objectContaining({ title: 'Русский' })])
    m.locale = 'ru'
  })
})


test('на главную попадают опубликованные проекты независимо от закрепления', async () => {
  const handler = await latest()
  await handler({} as H3Event)
  const query = m.findMany.mock.calls[0]?.[0] as { where: SQL }
  const sql = new PgDialect().sqlToQuery(query.where)
  expect(sql.sql).toContain('"post"."is_published" =')
  expect(sql.sql).not.toContain('"post"."is_pinned" =')
  expect(sql.sql).toContain('"post"."type" =')
  expect(sql.params).toEqual([true, 'project'])
})

test('без опубликованных проектов возвращает пустой список', async () => {
  const handler = await latest()
  expect(await handler({} as H3Event)).toEqual([])
  expect(m.findMany).toHaveBeenCalledTimes(1)
})


test('порядок главной совпадает с ручным приоритетом и добором по дате', async () => {
  const handler = await latest()
  await handler({} as H3Event)
  const { post } = await import('~~/server/db/schema')
  const query = m.findMany.mock.calls[0]?.[0] as { orderBy: (p: typeof post) => SQL[] }
  expect(query.orderBy(post).map(part => new PgDialect().sqlToQuery(part).sql)).toEqual([
    '"post"."is_pinned" desc',
    'case when "post"."is_pinned" then "post"."pin_order" end asc',
    '"post"."published_at" desc nulls last',
    '"post"."id" desc',
  ])
})

test('без закреплений возвращает опубликованный незакреплённый проект', async () => {
  const handler = await latest()
  m.findMany.mockResolvedValueOnce([{
    id: 1, slug: 'recent', type: 'project', title_ru: 'Свежий', title_en: '',
    excerpt_ru: '', excerpt_en: '', url: null, is_pinned: false,
    published_at: '2026-11-01', updated_at: '2026-11-01',
  }])
  expect(await handler({} as H3Event)).toEqual([expect.objectContaining({ id: 1, is_pinned: false, title: 'Свежий' })])
})
