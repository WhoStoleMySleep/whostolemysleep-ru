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
  test('public routes pass without a cookie', async () => {
    request('/api/posts/blog')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.readAdminToken).not.toHaveBeenCalled()
  })

  test('the admin login cannot require a session', async () => {
    request('/api/admin/login')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.readAdminToken).not.toHaveBeenCalled()
  })

  test('a protected route without a cookie is a 401', async () => {
    request('/api/admin/posts')
    await expect((await guard())(event)).rejects.toThrow(/Unauthorized/)
  })

  test('an invalid token is a 401 and the handler never runs', async () => {
    request('/api/admin/posts', 'bad')
    await expect((await guard())(event)).rejects.toThrow(/Invalid token/)
    expect(auth.slideAdminSession).not.toHaveBeenCalled()
  })

  test('a live session passes and is pushed forward', async () => {
    request('/api/admin/posts', 'good')
    await expect((await guard())(event)).resolves.toBeUndefined()
    expect(auth.slideAdminSession).toHaveBeenCalledWith(event, { admin: true, exp: 1 })
  })

  test('nested admin routes are closed just like the root ones', async () => {
    request('/api/admin/cv/apply')
    await expect((await guard())(event)).rejects.toThrow(/Unauthorized/)
  })
})
