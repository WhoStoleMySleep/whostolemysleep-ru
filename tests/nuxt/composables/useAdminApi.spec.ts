import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

const m = vi.hoisted(() => ({
  authed:   { value: true },
  request:  vi.fn(async () => ({ ok: true })),
  navigate: vi.fn(),
}))

mockNuxtImport('useState', () => () => m.authed)
mockNuxtImport('useRequestFetch', () => () => m.request)
mockNuxtImport('navigateTo', () => m.navigate)

async function api() {
  const { useAdminApi } = await import('~/composables/useAdminApi')
  return useAdminApi()
}

beforeEach(() => {
  m.authed = ref(true) as unknown as { value: boolean }
  m.request.mockClear().mockResolvedValue({ ok: true })
  m.navigate.mockClear()
})

describe('adminError', () => {
  test('takes the message from the H3 response body', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: 'Slug already exists' } })).toBe('Slug already exists')
  })

  test('falls back to statusMessage when there is no body', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ statusMessage: 'Unauthorized' })).toBe('Unauthorized')
  })

  test('a plain JS error is shown through its own message', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(new Error('Failed to fetch'))).toBe('Failed to fetch')
  })

  test('an empty message is not shown as emptiness', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: '' }, statusMessage: 'Bad Request' })).toBe('Bad Request')
  })

  test('a value that looks like nothing still yields text for a toast', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(undefined)).toBe('Unknown error')
    expect(adminError({})).toBe('Unknown error')
  })
})

describe('useAdminApi', () => {
  test('a read goes out with no options, a write with a method and a body', async () => {
    const a = await api()

    await a.get('/api/admin/education')
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education', undefined)

    await a.post('/api/admin/education', { institution: 'University' })
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education', { method: 'POST', body: { institution: 'University' } })

    await a.patch('/api/admin/education/1', { institution: 'University' })
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education/1', { method: 'PATCH', body: { institution: 'University' } })

    await a.remove('/api/admin/education/1')
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education/1', { method: 'DELETE' })
  })

  test('requests go through useRequestFetch — otherwise the cookie is lost on SSR', async () => {
    const a = await api()
    await a.get('/api/admin/posts')

    expect(m.request).toHaveBeenCalled()
  })

  test('an expired session clears the logged-in flag and redirects to login', async () => {
    m.request.mockRejectedValue({ statusCode: 401 })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.authed.value).toBe(false)
    expect(m.navigate).toHaveBeenCalledWith('/admin/login')
  })

  test('a 401 from the fetch response is recognised the same way', async () => {
    m.request.mockRejectedValue({ response: { status: 401 } })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.navigate).toHaveBeenCalledWith('/admin/login')
  })

  test('other errors do not throw the user out of the admin panel', async () => {
    m.request.mockRejectedValue({ statusCode: 500, data: { message: 'Save failed' } })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.authed.value).toBe(true)
    expect(m.navigate).not.toHaveBeenCalled()
  })
})
