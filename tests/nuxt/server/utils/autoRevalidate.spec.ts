import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const mocks = vi.hoisted(() => ({ revalidate: vi.fn() }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})
vi.mock('~~/server/utils/revalidate', () => ({ revalidatePaths: mocks.revalidate }))

const queued = (path: string, revision = '2026-11-21 12:00:00.123456+00') => ({ path, revision })

beforeEach(() => {
  plan(state)
  mocks.revalidate.mockReset().mockImplementation(async (paths: string[]) => ({ revalidated: paths, failed: [] }))
})
afterEach(() => vi.restoreAllMocks())

describe('Автоматическое обновление страниц', () => {
  test('не делает запросов для пустого списка', async () => {
    const { markDirty, flushPending } = await import('~~/server/utils/pending')
    await markDirty([])
    expect(await flushPending([])).toEqual({ ok: true, cleared: [], failed: [] })
    expect(state.calls).toHaveLength(0)
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  test('пустая очередь не запрашивает страницы', async () => {
    const { flushPending } = await import('~~/server/utils/pending')
    expect(await flushPending()).toEqual({ ok: true, cleared: [], failed: [] })
    expect(mocks.revalidate).toHaveBeenCalledWith([], [])
    expect(state.calls.some(call => call.op === 'delete')).toBe(false)
  })

  test('сначала записывает уникальные пути и новую версию, затем обновляет обе локали', async () => {
    plan(state, { 'select:pending_revalidation': [[queued('/projects')]] })
    const { markDirty } = await import('~~/server/utils/pending')
    await markDirty(['/projects', '/projects'])
    expect(state.calls[0]?.op).toBe('insert')
    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual([{ path: '/projects' }])
    const conflict = stepArg<{ set: { added_at: SQL } }>(state.calls, 'insert:pending_revalidation', 'onConflictDoUpdate')!
    expect(new PgDialect().sqlToQuery(conflict.set.added_at).sql).toContain("interval '1 microsecond'")
    expect(mocks.revalidate).toHaveBeenCalledWith(['/ru/projects', '/en/projects'], [])
    expect(state.calls.at(-1)?.op).toBe('delete')
  })

  test('одна неудачная локаль оставляет весь логический путь для повторной попытки', async () => {
    plan(state, { 'select:pending_revalidation': [[queued('/blog'), queued('/projects')]] })
    mocks.revalidate.mockResolvedValue({ revalidated: ['/ru/blog', '/ru/projects', '/en/projects'], failed: [{ path: '/en/blog', reason: 'HTTP 500' }] })
    const { flushPending } = await import('~~/server/utils/pending')
    const result = await flushPending()
    expect(result.ok).toBe(false)
    const where = stepArg<SQL>(state.calls, 'delete:pending_revalidation', 'where')!
    expect(new PgDialect().sqlToQuery(where).params).toEqual(['/projects', queued('').revision])
  })

  test('не очищает очередь при полном отказе обновления', async () => {
    plan(state, { 'select:pending_revalidation': [[queued('/projects')]] })
    mocks.revalidate.mockResolvedValue({ revalidated: [], failed: [{ path: '/ru/projects', reason: 'HTTP 403' }] })
    const { flushPending } = await import('~~/server/utils/pending')
    expect((await flushPending()).ok).toBe(false)
    expect(state.calls.some(call => call.op === 'delete')).toBe(false)
  })

  test('сбой ревалидации не превращает сохранённый контент в ошибку сохранения', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    plan(state, { 'select:pending_revalidation': [[queued('/projects')]] })
    mocks.revalidate.mockRejectedValue(new Error('Missing token'))
    const { markDirty } = await import('~~/server/utils/pending')
    await expect(markDirty(['/projects'])).resolves.toBeUndefined()
    expect(log).toHaveBeenCalled()
    expect(state.calls.some(call => call.op === 'delete')).toBe(false)
  })

  test('подтверждает ожидаемый 404 по БД, но не скрывает пропавшую опубликованную страницу', async () => {
    plan(state, {
      'select:pending_revalidation': [[...['external', 'draft', 'deleted', 'published', 'internal'].map(slug => queued(`/blog/${slug}`))]],
      'select:post': [[
        { slug: 'external', type: 'project', url: 'https://example.com', is_published: true },
        { slug: 'draft', type: 'blog', url: null, is_published: false },
        { slug: 'published', type: 'blog', url: 'https://example.com', is_published: true },
        { slug: 'internal', type: 'project', url: '', is_published: true },
      ]],
    })
    const { flushPending } = await import('~~/server/utils/pending')
    await flushPending()
    expect(mocks.revalidate.mock.calls[0]?.[1]).toEqual(['external', 'draft', 'deleted'].flatMap(slug => [`/ru/blog/${slug}`, `/en/blog/${slug}`]))
  })

  test('путь с локалью обрабатывается один раз и тоже проверяется на ожидаемый 404', async () => {
    plan(state, { 'select:pending_revalidation': [[queued('/en/blog/deleted')]] })
    const { flushPending } = await import('~~/server/utils/pending')
    await flushPending()
    expect(mocks.revalidate).toHaveBeenCalledWith(['/en/blog/deleted'], ['/en/blog/deleted'])
  })

  test('проверяет существование кейса по типу маршрута, включая локализованный путь', async () => {
    const paths = ['/projects/deleted', '/projects/draft', '/projects/published', '/en/projects/article', '/ru/projects/published']
    plan(state, {
      'select:pending_revalidation': [paths.map(path => queued(path))],
      'select:post': [[
        { slug: 'draft', type: 'project', url: null, is_published: false },
        { slug: 'published', type: 'project', url: 'https://example.com', is_published: true },
        { slug: 'article', type: 'blog', url: null, is_published: true },
      ]],
    })
    const { flushPending } = await import('~~/server/utils/pending')
    await flushPending()
    expect(mocks.revalidate.mock.calls[0]?.[1]).toEqual([
      '/ru/projects/deleted', '/en/projects/deleted', '/ru/projects/draft', '/en/projects/draft', '/en/projects/article',
    ])
  })

  test('при завершении сравнивает точную версию очереди, а не только путь', async () => {
    const { clearPending } = await import('~~/server/utils/pending')
    await clearPending([queued('/blog')])
    const query = new PgDialect().sqlToQuery(stepArg<SQL>(state.calls, 'delete:pending_revalidation', 'where')!)
    expect(query.sql).toContain('"pending_revalidation"."added_at" =')
    expect(query.sql).toContain('::timestamptz')
    expect(query.params).toEqual(['/blog', '2026-11-21 12:00:00.123456+00'])
  })

  test('общие настройки обновляют также кейсы проектов с внешними сайтами', async () => {
    plan(state, { 'select:post': [[{ slug: 'article', type: 'blog', url: null }, { slug: 'external', type: 'project', url: 'https://example.com' }]] })
    const { sitePaths } = await import('~~/server/utils/pending')
    expect(await sitePaths()).toEqual(['/', '/blog', '/projects', '/resume', '/cv', '/contacts', '/privacy', '/blog/article', '/projects/external'])
  })
})

test('ручной Flush использует ту же очередь и возвращает ошибки локалей', async () => {
  plan(state, { 'select:pending_revalidation': [[queued('/projects')]] })
  mocks.revalidate.mockResolvedValue({ revalidated: ['/ru/projects'], failed: [{ path: '/en/projects', reason: 'HTTP 500' }] })
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  try {
    const { default: handler } = await import('~~/server/api/admin/revalidate.post')
    const result = await (handler as unknown as () => Promise<{ ok: boolean; failed: unknown[] }>)()
    expect(result).toEqual({ ok: false, cleared: ['/ru/projects'], failed: [{ path: '/en/projects', reason: 'HTTP 500' }] })
    expect(state.calls.some(call => call.op === 'delete')).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})

describe('Обновление страниц связанной с изображением записи', () => {
  test.each([
    { type: 'blog', url: null, details: ['/blog/post'] },
    { type: 'blog', url: 'https://example.com', details: ['/blog/post'] },
    { type: 'project', url: null, details: ['/projects/post', '/blog/post'] },
    { type: 'project', url: '', details: ['/projects/post', '/blog/post'] },
    { type: 'project', url: 'https://example.com', details: ['/projects/post'] },
  ])('тип=$type url=$url учитывает наличие внутренней страницы', async ({ type, url, details }) => {
    const paths = ['/', '/blog', '/projects', ...details]
    plan(state, {
      'select:post': [[{ slug: 'post', type, url, is_published: true }]],
      'select:pending_revalidation': [paths.map(path => queued(path))],
    })
    const { markPostDirty } = await import('~~/server/utils/pending')
    await markPostDirty(19)
    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual(paths.map(path => ({ path })))
    const where = new PgDialect().sqlToQuery(stepArg<SQL>(state.calls, 'select:post', 'where')!)
    expect(where.params).toEqual([19])
    expect(mocks.revalidate).toHaveBeenCalledWith(paths.flatMap(path => {
      const suffix = path === '/' ? '' : path
      return [`/ru${suffix}`, `/en${suffix}`]
    }), [])
  })

  test('не ставит несуществующую запись в очередь', async () => {
    const { markPostDirty } = await import('~~/server/utils/pending')
    await markPostDirty(404)
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]?.op).toBe('select')
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
})
