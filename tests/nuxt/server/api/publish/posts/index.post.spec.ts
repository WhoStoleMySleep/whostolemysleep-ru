import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({ token: vi.fn(), limit: vi.fn(), save: vi.fn(), status: vi.fn(), read: vi.fn() }))
mockNuxtImport('setResponseStatus', () => mocks.status)
vi.mock('~~/server/utils/publishAuth', () => ({ requirePublishToken: mocks.token }))
vi.mock('~~/server/utils/rateLimit', () => ({ clientIp: () => '127.0.0.1', hitRateLimit: mocks.limit }))
vi.mock('~~/server/utils/publishPost', () => ({ savePublishedPost: mocks.save }))

const event = {} as H3Event
const body = { slug: 'hello', title: 'Привет', body_md: '# Текст' }
async function publish() {
  const { default: handler } = await import('~~/server/api/publish/posts/index.post')
  return (handler as (event: H3Event) => Promise<unknown>)(event)
}

beforeEach(() => {
  mocks.token.mockReset()
  mocks.limit.mockReset().mockResolvedValue({ allowed: true })
  mocks.save.mockReset().mockResolvedValue({ id: 7, slug: 'hello', url: 'https://site.test/blog/hello' })
  mocks.status.mockReset()
  mocks.read.mockReset().mockResolvedValue(body)
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('setResponseStatus', mocks.status)
  vi.stubGlobal('readBody', mocks.read)
})
afterEach(() => vi.unstubAllGlobals())

describe('Публикация статьи', () => {
  test('ограничивает частоту перед авторизацией и возвращает результат со статусом 201', async () => {
    expect(await publish()).toEqual({ id: 7, slug: 'hello', url: 'https://site.test/blog/hello' })
    expect(mocks.limit).toHaveBeenCalledExactlyOnceWith('publish:127.0.0.1', 60, 60 * 60 * 1000)
    expect(mocks.token).toHaveBeenCalledExactlyOnceWith(event)
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith(body)
    expect(mocks.status).toHaveBeenCalledExactlyOnceWith(event, 201)
    expect(mocks.limit.mock.invocationCallOrder[0]).toBeLessThan(mocks.token.mock.invocationCallOrder[0]!)
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(mocks.status.mock.invocationCallOrder[0]!)
  })

  test('при превышении лимита не авторизует запрос и не читает тело', async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfter: 17 })
    await expect(publish()).rejects.toMatchObject({ statusCode: 429, message: 'Too many requests. Retry after 17s' })
    expect(mocks.token).not.toHaveBeenCalled()
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  test('ошибка авторизации не сохраняет статью', async () => {
    mocks.token.mockImplementation(() => { throw Object.assign(new Error('Unauthorized'), { statusCode: 401 }) })
    await expect(publish()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  test.each([null, {}, { ...body, slug: '' }, { ...body, title: '' }, { ...body, body_md: '' }])('отклоняет неполное тело %j', async payload => {
    mocks.read.mockResolvedValue(payload)
    await expect(publish()).rejects.toMatchObject({ statusCode: 400, message: 'Fields slug, title and body_md are required' })
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.status).not.toHaveBeenCalled()
  })

  test('ошибка сохранения не заменяется успешным статусом', async () => {
    mocks.save.mockRejectedValue(new Error('Save failed'))
    await expect(publish()).rejects.toThrow('Save failed')
    expect(mocks.status).not.toHaveBeenCalled()
  })
})
