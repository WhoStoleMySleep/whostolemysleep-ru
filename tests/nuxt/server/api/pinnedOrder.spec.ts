import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'

const mocks = vi.hoisted(() => ({ execute: vi.fn(), dirty: vi.fn() }))
vi.mock('~~/server/db', () => ({ db: { execute: mocks.execute } }))
vi.mock('~~/server/utils/pending', () => ({ markDirty: mocks.dirty, postPaths: () => ['/', '/blog', '/projects'] }))

async function reorder(body: unknown) {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => body)
  const { default: handler } = await import('~~/server/api/admin/posts/reorder.patch')
  return (handler as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.execute.mockResolvedValue({ rows: [{ id: 2 }, { id: 1 }] })
})
afterEach(() => vi.unstubAllGlobals())

describe('Единый порядок закреплённых', () => {
  test('записывает порядок одним запросом и ставит публичные страницы в очередь обновления', async () => {
    expect(await reorder({ ids: [2, 1] })).toEqual({ ok: true })
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL)
    expect(query.params).toEqual([2, 0, 1, 1, 2])
    expect(query.sql).toContain('not exists')
    expect(query.sql).toContain('select count(*) from locked_pins')
    expect(mocks.dirty).toHaveBeenCalledWith(['/', '/blog', '/projects'])
  })

  test('блокирует весь набор до проверки, чтобы открепление в другой вкладке не вызвало частичную запись', async () => {
    await reorder({ ids: [2, 1] })
    const query = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL)
    expect(query.sql).toMatch(/locked_pins as materialized\s*\(\s*select id from "post" where is_pinned order by id for update/)
    expect(query.sql).toContain('id not in (select id from desired)')
  })

  test.each([null, {}, { ids: [] }, { ids: [1, 1] }, { ids: [0] }, { ids: ['1'] }, { ids: [1.2] }, { ids: Array.from({ length: 1001 }, (_, i) => i + 1) }])('отклоняет некорректный набор %j', async body => {
    await expect(reorder(body)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  test('устаревший набор закреплений не сохраняет частичный порядок', async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [] })
    await expect(reorder({ ids: [2, 1] })).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.dirty).not.toHaveBeenCalled()
  })
})
