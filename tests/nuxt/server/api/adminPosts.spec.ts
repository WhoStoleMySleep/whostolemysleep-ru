import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})
vi.mock('~~/server/utils/pending', () => ({ markDirty: vi.fn(), postPaths: () => [] }))

async function save(body: Record<string, unknown>, create = false) {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getRouterParam', () => '7')
  vi.stubGlobal('readBody', async () => body)
  const mod = create
    ? await import('~~/server/api/admin/posts/index.post')
    : await import('~~/server/api/admin/posts/[id].patch')
  return (mod.default as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

beforeEach(() => {
  const row = { id: 7, slug: 'hello', is_pinned: true }
  plan(state, { 'insert:post': [[row]], 'update:post': [[row]] })
})
afterEach(() => vi.unstubAllGlobals())

describe('Закрепление и теги в админке', () => {
  test('создаёт закреплённый проект с несколькими тегами', async () => {
    await save({ type: 'project', slug: 'hello', title_ru: 'Привет', text_ru: '', text_en: '', is_pinned: true, tag_ids: [2, 3] }, true)
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.is_pinned).toBe(true)
    expect(stepArg(state.calls, 'insert:post_tag', 'values')).toEqual([{ post_id: 7, tag_id: 2 }, { post_id: 7, tag_id: 3 }])
  })

  test.each([true, false])('сохраняет is_pinned=%s и заменяет набор тегов', async (is_pinned) => {
    await save({ is_pinned, tag_ids: [2, 3] })
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:post', 'set')?.is_pinned).toBe(is_pinned)
    expect(stepArg(state.calls, 'insert:post_tag', 'values')).toHaveLength(2)
  })

  test('пустой набор удаляет все теги', async () => {
    await save({ tag_ids: [] })
    expect(state.calls.some(c => c.op === 'delete' && c.table === 'post_tag')).toBe(true)
    expect(state.calls.some(c => c.op === 'insert' && c.table === 'post_tag')).toBe(false)
  })

  test('изменение публикации не сбрасывает закрепление и теги', async () => {
    await save({ is_published: false })
    expect(stepArg(state.calls, 'update:post', 'set')).not.toHaveProperty('is_pinned')
    expect(state.calls.some(c => c.table === 'post_tag')).toBe(false)
  })
})


test.each([true, false])('запись и создание используют ту же блокировку при create=%s', async (create) => {
  await save({ is_pinned: true, text_ru: '', text_en: '' }, create)
  expect(state.calls[0]?.op).toBe('execute')
  const { PgDialect } = await import('drizzle-orm/pg-core')
  const query = new PgDialect().sqlToQuery(state.calls[0]!.steps[0]!.args[0] as import('drizzle-orm').SQL)
  expect(query.sql).toContain('pg_advisory_xact_lock')
  expect(query.params).toEqual([7230461])
})
