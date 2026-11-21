import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const mocks = vi.hoisted(() => ({ dirty: vi.fn() }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})
vi.mock('~~/server/utils/pending', async (importOriginal) => ({
  ...await importOriginal<typeof import('~~/server/utils/pending')>(),
  markDirty: mocks.dirty,
}))

const routes = [
  { action: 'создание опыта', load: () => import('~~/server/api/admin/experience/index.post') },
  { action: 'изменение опыта', load: () => import('~~/server/api/admin/experience/[id].patch') },
  { action: 'удаление опыта', load: () => import('~~/server/api/admin/experience/[id].delete') },
  { action: 'перестановка опыта', load: () => import('~~/server/api/admin/experience/reorder.patch') },
  { action: 'создание образования', load: () => import('~~/server/api/admin/education/index.post') },
  { action: 'изменение образования', load: () => import('~~/server/api/admin/education/[id].patch') },
  { action: 'удаление образования', load: () => import('~~/server/api/admin/education/[id].delete') },
  { action: 'перестановка образования', load: () => import('~~/server/api/admin/education/reorder.patch') },
  { action: 'создание группы навыков', load: () => import('~~/server/api/admin/skills/index.post') },
  { action: 'изменение группы навыков', load: () => import('~~/server/api/admin/skills/groups/[id].patch') },
  { action: 'удаление группы навыков', load: () => import('~~/server/api/admin/skills/groups/[id].delete') },
  { action: 'перестановка групп навыков', load: () => import('~~/server/api/admin/skills/groups/reorder.patch') },
  { action: 'создание навыка', load: () => import('~~/server/api/admin/skills/items/index.post') },
  { action: 'изменение навыка', load: () => import('~~/server/api/admin/skills/items/[id].patch') },
  { action: 'удаление навыка', load: () => import('~~/server/api/admin/skills/items/[id].delete') },
  { action: 'перестановка навыков', load: () => import('~~/server/api/admin/skills/items/reorder.patch') },
]

beforeEach(() => {
  plan(state, Object.fromEntries(['experience', 'education', 'skill_group', 'skill'].flatMap(table => [
    [`insert:${table}`, [[{ id: 7 }]]],
    [`update:${table}`, [[{ id: 7 }]]],
  ])))
  mocks.dirty.mockReset()
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', () => '7')
  vi.stubGlobal('readBody', async () => ({ ids: [7, 3] }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Инвалидация резюме и печатного CV', () => {
  test.each(routes)('$action обновляет главную, резюме и CV через общую очередь', async ({ load }) => {
    const { default: handler } = await load()
    await (handler as (event: H3Event) => Promise<unknown>)({} as H3Event)
    expect(mocks.dirty).toHaveBeenCalledExactlyOnceWith(['/', '/resume', '/cv'])
  })

  test.each([routes[1]!, routes[5]!, routes[9]!, routes[13]!])('$action не запускает обновление для отсутствующей записи', async ({ load }) => {
    plan(state)
    const { default: handler } = await load()
    await expect((handler as (event: H3Event) => Promise<unknown>)({} as H3Event)).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.dirty).not.toHaveBeenCalled()
  })
})
