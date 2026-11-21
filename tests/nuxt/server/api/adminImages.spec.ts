import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const mocks = vi.hoisted(() => ({ dirty: vi.fn(), del: vi.fn() }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})
vi.mock('~~/server/utils/pending', () => ({ markPostDirty: mocks.dirty }))
vi.mock('@vercel/blob', () => ({ del: mocks.del }))

const image = { id: 7, post_id: 19, url: 'https://example.com/image.webp' }
const routes = [
  { action: 'добавление', load: () => import('~~/server/api/admin/posts/[id]/images.post'), id: '19', op: 'insert' },
  { action: 'подпись', load: () => import('~~/server/api/admin/images/[id].patch'), id: '7', op: 'update' },
  { action: 'удаление', load: () => import('~~/server/api/admin/images/[id].delete'), id: '7', op: 'delete' },
]

type Route = typeof routes[number]
async function request(route: Route, body: Record<string, unknown> = { url: image.url, alt_ru: 'Подпись' }) {
  vi.stubGlobal('getRouterParam', () => route.id)
  vi.stubGlobal('readBody', async () => body)
  const { default: handler } = await route.load()
  return (handler as (event: H3Event) => Promise<unknown>)({} as H3Event)
}

beforeEach(() => {
  plan(state, { 'select:image': [[image]], 'insert:image': [[image]], 'update:image': [[image]] })
  mocks.dirty.mockReset().mockImplementation(async () => {
    expect(state.calls.some(call => call.table === 'image' && ['insert', 'update', 'delete'].includes(call.op))).toBe(true)
  })
  mocks.del.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
})
afterEach(() => vi.unstubAllGlobals())

describe('Обновление страниц после изменения изображения', () => {
  test.each(routes)('$action обновляет связанную запись только после изменения БД', async (route) => {
    await request(route)
    expect(mocks.dirty).toHaveBeenCalledExactlyOnceWith(19)
    expect(state.calls.some(call => call.op === route.op && call.table === 'image')).toBe(true)
    expect(mocks.del).not.toHaveBeenCalled()
  })

  test.each(routes)('$action отклоняет некорректный id без обновления страниц', async (route) => {
    await expect(request({ ...route, id: 'invalid' })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.dirty).not.toHaveBeenCalled()
    expect(state.calls).toHaveLength(0)
  })

  test('пустой URL не создаёт изображение и не запускает обновление', async () => {
    await expect(request(routes[0]!, {})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.dirty).not.toHaveBeenCalled()
    expect(state.calls).toHaveLength(0)
  })

  test('отсутствующее изображение не запускает обновление при изменении подписи', async () => {
    plan(state)
    expect(await request(routes[1]!)).toBeUndefined()
    expect(mocks.dirty).not.toHaveBeenCalled()
  })

  test('отсутствующее изображение не запускает обновление при удалении', async () => {
    plan(state)
    await expect(request(routes[2]!)).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.dirty).not.toHaveBeenCalled()
    expect(mocks.del).not.toHaveBeenCalled()
  })

  test('обновляет страницы после удаления изображения из Blob и БД', async () => {
    const blob = { ...image, url: 'https://test.public.blob.vercel-storage.com/image.webp' }
    plan(state, { 'select:image': [[blob]] })
    await request(routes[2]!)
    expect(mocks.del).toHaveBeenCalledWith(blob.url, expect.any(Object))
    expect(mocks.dirty).toHaveBeenCalledExactlyOnceWith(19)
  })

  test('ошибка удаления Blob не удаляет строку и не запускает обновление страниц', async () => {
    plan(state, { 'select:image': [[{ ...image, url: 'https://test.public.blob.vercel-storage.com/image.webp' }]] })
    mocks.del.mockRejectedValue(new Error('Blob unavailable'))
    await expect(request(routes[2]!)).rejects.toThrow('Blob unavailable')
    expect(state.calls.some(call => call.op === 'delete')).toBe(false)
    expect(mocks.dirty).not.toHaveBeenCalled()
  })
})
