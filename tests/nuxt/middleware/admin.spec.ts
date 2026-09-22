import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

const m = vi.hoisted(() => ({
  authed:  { value: false },
  request: vi.fn(async () => ({ admin: true })),
  navigate: vi.fn((to: string) => to),
}))

mockNuxtImport('defineNuxtRouteMiddleware', () => (fn: unknown) => fn)
mockNuxtImport('useState', () => () => m.authed)
mockNuxtImport('useRequestFetch', () => () => m.request)
mockNuxtImport('navigateTo', () => m.navigate)

const route = (path: string) => ({ path }) as RouteLocationNormalized

async function middleware() {
  const mod = await import('~/middleware/admin')
  return mod.default as unknown as (to: RouteLocationNormalized) => Promise<unknown>
}

beforeEach(() => {
  m.authed = ref(false) as unknown as { value: boolean }
  m.request.mockClear().mockResolvedValue({ admin: true })
  m.navigate.mockClear()
})

describe('admin middleware', () => {
  test('the login page is not checked — otherwise there would be nowhere to log in', async () => {
    await (await middleware())(route('/admin/login'))

    expect(m.request).not.toHaveBeenCalled()
    expect(m.navigate).not.toHaveBeenCalled()
  })

  test('a live session lets the user through and is remembered', async () => {
    const mw = await middleware()
    await mw(route('/admin'))

    expect(m.request).toHaveBeenCalledWith('/api/admin/me')
    expect(m.authed.value).toBe(true)
    expect(m.navigate).not.toHaveBeenCalled()
  })

  test('a remembered session does not hit the network on every navigation', async () => {
    const mw = await middleware()
    await mw(route('/admin'))
    m.request.mockClear()

    await mw(route('/admin/posts'))

    expect(m.request).not.toHaveBeenCalled()
  })

  test('a rejection from the API sends the user to login', async () => {
    m.request.mockRejectedValue({ statusCode: 401 })

    const out = await (await middleware())(route('/admin/posts'))

    expect(m.navigate).toHaveBeenCalledWith('/admin/login')
    expect(out).toBe('/admin/login')
    expect(m.authed.value).toBe(false)
  })
})
