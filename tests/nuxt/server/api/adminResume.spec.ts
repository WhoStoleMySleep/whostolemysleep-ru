import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
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

async function saveExperience(body: Record<string, unknown>, create = false) {
  vi.stubGlobal('readBody', async () => body)
  const route = routes[create ? 0 : 1]!
  const { default: handler } = await route.load()
  return (handler as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

describe('Сохранение опыта и пунктов описания', () => {
  test('создаёт опыт с прежними значениями по умолчанию и упорядоченными пунктами', async () => {
    const bullets = [{ text_ru: 'Первый', text_en: 'First' }, { text_ru: 'Второй', text_en: 'Second' }]
    expect(await saveExperience({ company_ru: 'Компания', bullets }, true)).toEqual({ id: 7 })
    expect(stepArg(state.calls, 'insert:experience', 'values')).toMatchObject({ company_ru: 'Компания', date_to: null, order: 0 })
    expect(stepArg(state.calls, 'insert:experience_bullet', 'values')).toEqual([
      { experience_id: 7, text_ru: 'Первый', text_en: 'First', order: 0 },
      { experience_id: 7, text_ru: 'Второй', text_en: 'Second', order: 1 },
    ])
  })

  test.each([undefined, []])('не вставляет пустой список пунктов при создании: %j', async bullets => {
    await saveExperience({ company_ru: 'Компания', bullets }, true)
    expect(state.calls.some(call => call.table === 'experience_bullet')).toBe(false)
  })

  test('сохраняет пункты при их отсутствии в PATCH и удаляет при пустом массиве', async () => {
    await saveExperience({ position_ru: 'Разработчик' })
    expect(state.calls.some(call => call.table === 'experience_bullet')).toBe(false)
    await saveExperience({ bullets: [] })
    expect(state.calls.filter(call => call.table === 'experience_bullet').map(call => call.op)).toEqual(['delete'])
  })

  test('заменяет пункты после обновления опыта, не сохраняя посторонние поля', async () => {
    const body = { company_ru: 'Компания', bullets: [{ text_ru: 'Текст', text_en: 'Text', order: 99, experience_id: 999 }] }
    await saveExperience(body)
    expect(stepArg(state.calls, 'update:experience', 'set')).toEqual({ company_ru: 'Компания' })
    expect(state.calls.map(call => `${call.op}:${call.table}`)).toEqual(['update:experience', 'delete:experience_bullet', 'insert:experience_bullet'])
    expect(stepArg(state.calls, 'insert:experience_bullet', 'values')).toEqual([{ experience_id: 7, text_ru: 'Текст', text_en: 'Text', order: 0 }])
    expect(body.bullets[0]?.order).toBe(99)
  })

  test('отсутствующий опыт не удаляет пункты и не ставит страницы в очередь', async () => {
    plan(state)
    await expect(saveExperience({ bullets: [] })).rejects.toMatchObject({ statusCode: 404 })
    expect(state.calls.some(call => call.table === 'experience_bullet')).toBe(false)
    expect(mocks.dirty).not.toHaveBeenCalled()
  })
})
