import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { desc } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { H3Event } from 'h3'
import { post } from '~~/server/db/schema'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(async (_query: unknown) => []), type: 'project' }))
vi.mock('~~/server/db', () => ({ db: { query: { post: { findMany: mocks.findMany } } } }))

beforeEach(() => mocks.findMany.mockClear())
afterEach(() => vi.unstubAllGlobals())

async function query(type: string) {
  mocks.type = type
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getRouterParam', () => mocks.type)
  vi.stubGlobal('getQuery', () => ({ locale: 'ru' }))
  const { default: handler } = await import('~~/server/api/posts/[type].get')
  await (handler as unknown as (event: H3Event) => Promise<unknown>)({} as H3Event)
  return mocks.findMany.mock.calls[0]![0] as { orderBy: (table: typeof post, ops: { desc: typeof desc }) => SQL[] }
}

describe('Порядок проектов и статей', () => {
  test.each(['project', 'blog'])('в %s сначала закреплённые, затем новые; записи без даты в конце группы', async (type) => {
    const options = await query(type)
    const orders = options.orderBy(post, { desc }).map(sql => new PgDialect().sqlToQuery(sql).sql)
    expect(orders).toEqual([
      '"post"."is_pinned" desc',
      'case when "post"."is_pinned" then "post"."pin_order" end asc',
      '"post"."published_at" desc nulls last',
      '"post"."id" desc',
    ])
  })
})
