import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

const auth = vi.hoisted(() => ({
  readAdminToken:    vi.fn(async (token: string) => (token === 'good' ? { admin: true, exp: 1 } : null)),
  slideAdminSession: vi.fn(async () => {}),
}))

vi.mock('~~/server/utils/auth', () => ({
  ADMIN_COOKIE:      'wms_admin',
  readAdminToken:    auth.readAdminToken,
  slideAdminSession: auth.slideAdminSession,
}))

const event = {} as H3Event

function request(path: string, cookie?: string) {
  vi.stubGlobal('getRequestURL', () => new URL(`https://example.com${path}`))
  vi.stubGlobal('getCookie', () => cookie)
}

async function guard() {
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  const mod = await import('~~/server/middleware/admin-guard')
  return mod.default as unknown as (e: H3Event) => Promise<void>
}

beforeEach(() => {
  auth.readAdminToken.mockClear()
  auth.slideAdminSession.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('admin-guard', () => {
  test('публичные маршруты проходят без куки', async () => {
    request('/api/posts/blog')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.readAdminToken).not.toHaveBeenCalled()
  })

  test('вход в админку не может требовать сессии', async () => {
    request('/api/admin/login')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.readAdminToken).not.toHaveBeenCalled()
  })

  test('защищённый маршрут без куки — 401', async () => {
    request('/api/admin/posts')
    await expect((await guard())(event)).rejects.toThrow(/Unauthorized/)
  })

  test('негодный токен — 401, обработчик не запускается', async () => {
    request('/api/admin/posts', 'bad')
    await expect((await guard())(event)).rejects.toThrow(/Invalid token/)
    expect(auth.slideAdminSession).not.toHaveBeenCalled()
  })

  test('живая сессия проходит и сдвигается вперёд', async () => {
    request('/api/admin/posts', 'good')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.slideAdminSession).toHaveBeenCalledWith(event, { admin: true, exp: 1 })
  })

  test('вложенные маршруты админки закрыты так же, как корневые', async () => {
    request('/api/admin/cv/apply')
    await expect((await guard())(event)).rejects.toThrow(/Unauthorized/)
  })
})
