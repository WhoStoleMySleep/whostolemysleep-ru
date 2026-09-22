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
  test('берёт сообщение из тела ответа H3', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: 'Slug already exists' } })).toBe('Slug already exists')
  })

  test('без тела откатывается на statusMessage', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ statusMessage: 'Unauthorized' })).toBe('Unauthorized')
  })

  test('обычная ошибка JS показывается своим message', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(new Error('Failed to fetch'))).toBe('Failed to fetch')
  })

  test('пустое сообщение не показывается пустотой', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: '' }, statusMessage: 'Bad Request' })).toBe('Bad Request')
  })

  test('ни на что не похожее значение всё равно даёт текст для тоста', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(undefined)).toBe('Unknown error')
    expect(adminError({})).toBe('Unknown error')
  })
})

describe('useAdminApi', () => {
  test('чтение уходит без опций, запись — с методом и телом', async () => {
    const a = await api()

    await a.get('/api/admin/education')
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education', undefined)

    await a.post('/api/admin/education', { institution: 'ВУЗ' })
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education', { method: 'POST', body: { institution: 'ВУЗ' } })

    await a.patch('/api/admin/education/1', { institution: 'ВУЗ' })
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education/1', { method: 'PATCH', body: { institution: 'ВУЗ' } })

    await a.remove('/api/admin/education/1')
    expect(m.request).toHaveBeenLastCalledWith('/api/admin/education/1', { method: 'DELETE' })
  })

  test('запросы идут через useRequestFetch — иначе при SSR кука не уедет', async () => {
    const a = await api()
    await a.get('/api/admin/posts')

    expect(m.request).toHaveBeenCalled()
  })

  test('протухшая сессия сбрасывает признак входа и уводит на логин', async () => {
    m.request.mockRejectedValue({ statusCode: 401 })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.authed.value).toBe(false)
    expect(m.navigate).toHaveBeenCalledWith('/admin/login')
  })

  test('401 из ответа fetch распознаётся так же', async () => {
    m.request.mockRejectedValue({ response: { status: 401 } })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.navigate).toHaveBeenCalledWith('/admin/login')
  })

  test('прочие ошибки не выкидывают из админки', async () => {
    m.request.mockRejectedValue({ statusCode: 500, data: { message: 'Save failed' } })
    const a = await api()

    await expect(a.get('/api/admin/posts')).rejects.toBeTruthy()
    expect(m.authed.value).toBe(true)
    expect(m.navigate).not.toHaveBeenCalled()
  })
})
