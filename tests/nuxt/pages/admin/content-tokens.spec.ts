import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ContentTokenInfo } from '~~/shared/content/types'

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), ask: vi.fn(), ok: vi.fn(), err: vi.fn(), tokens: [] as ContentTokenInfo[] }))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminConfirm', () => () => ({ ask: mocks.ask }))
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))

beforeEach(() => {
  vi.resetAllMocks()
  clearNuxtData()
  mocks.tokens = []
  mocks.ask.mockResolvedValue(true)
  mocks.get.mockImplementation(async () => structuredClone(mocks.tokens))
  mocks.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/revoke')) { mocks.tokens = mocks.tokens.map(token => ({ ...token, revokedAt: '2026-11-24' })); return { ok: true } }
    mocks.tokens = [{ id: 'token-1', label: 'Мой MCP', resources: ['pages'], scopes: ['read', 'plan'], expiresAt: '2099-01-01', revokedAt: null }]
    return { token: 'one-time-secret', id: 'token-1' }
  })
})

async function tokensPage() {
  const { default: Tokens } = await import('~/pages/admin/content-tokens.vue')
  return mountSuspended(Tokens)
}

async function createToken(wrapper: Awaited<ReturnType<typeof tokensPage>>) {
  await wrapper.get('input[type="text"]').setValue('Мой MCP')
  await wrapper.get('.token-form button').trigger('click')
  await flushPromises()
}

describe('Токены контента', () => {
  test('по умолчанию выдаёт только read+plan, секрет хранится только до скрытия', async () => {
    const wrapper = await tokensPage()
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    await createToken(wrapper)
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/tokens', {
      label: 'Мой MCP', resources: ['pages'], scopes: ['read', 'plan'], expiresInDays: 30,
    })
    expect(wrapper.get('.token-reveal code').text()).toBe('one-time-secret')
    expect(storage).not.toHaveBeenCalled()
    expect(mocks.get.mock.calls.every(([url]) => !url.includes('one-time-secret'))).toBe(true)
    await wrapper.get('[data-action="hide-token"]').trigger('click')
    expect(wrapper.text()).not.toContain('one-time-secret')
    wrapper.unmount()
    const reopened = await tokensPage()
    expect(reopened.text()).not.toContain('one-time-secret')
    expect(reopened.text()).toContain('Мой MCP')
    reopened.unmount()
    storage.mockRestore()
  })

  test('позволяет выбрать ресурсы, apply и срок, но объясняет обязательное одобрение', async () => {
    const wrapper = await tokensPage()
    await wrapper.get('input[type="text"]').setValue('Мой MCP')
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[1]!.setValue(true)
    await checkboxes.at(-1)!.setValue(true)
    await wrapper.get('input[type="number"]').setValue(7)
    await wrapper.get('.token-form button').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/api/admin/content/tokens', {
      label: 'Мой MCP', resources: ['pages', 'post'], scopes: ['read', 'plan', 'apply'], expiresInDays: 7,
    })
    expect(wrapper.text()).toContain('сервер всё равно требует одобрения владельца')
    wrapper.unmount()
  })

  test('без ресурсов или при недопустимом сроке токен не создаётся', async () => {
    const wrapper = await tokensPage()
    await wrapper.get('input[type="text"]').setValue('Мой MCP')
    await wrapper.get('input[type="checkbox"]').setValue(false)
    expect(wrapper.get('.token-form button').attributes('disabled')).toBeDefined()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('input[type="number"]').setValue(91)
    expect(wrapper.get('.token-form button').attributes('disabled')).toBeDefined()
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('отзыв требует подтверждения, убирает секрет и обновляет статус', async () => {
    const wrapper = await tokensPage()
    await createToken(wrapper)
    await wrapper.get('.token-row button').trigger('click')
    await flushPromises()
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ action: 'Отозвать' }))
    expect(mocks.post).toHaveBeenLastCalledWith('/api/admin/content/tokens/revoke', { id: 'token-1' })
    expect(wrapper.find('.token-row button').exists()).toBe(false)
    expect(wrapper.text()).toContain('отозван 2026-11-24')
    expect(wrapper.text()).not.toContain('one-time-secret')
    wrapper.unmount()
  })

  test('отмена отзыва не меняет токен', async () => {
    mocks.ask.mockResolvedValue(false)
    const wrapper = await tokensPage()
    await createToken(wrapper)
    await wrapper.get('.token-row button').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.token-row button').exists()).toBe(true)
    wrapper.unmount()
  })

  test('503 сообщает об отключённых изменениях, не показывает выдуманный секрет', async () => {
    mocks.post.mockRejectedValue({ statusCode: 503 })
    const wrapper = await tokensPage()
    await createToken(wrapper)
    expect(wrapper.text()).toContain('Изменения контента отключены')
    expect(wrapper.find('.token-reveal').exists()).toBe(false)
    expect(mocks.ok).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('два клика не выпускают два параллельных токена', async () => {
    let resolve!: (value: unknown) => void
    mocks.post.mockImplementation(() => new Promise(done => { resolve = done }))
    const wrapper = await tokensPage()
    await wrapper.get('input[type="text"]').setValue('Мой MCP')
    await wrapper.get('.token-form button').trigger('click')
    await wrapper.get('.token-form button').trigger('click')
    expect(mocks.post).toHaveBeenCalledTimes(1)
    resolve({ token: 'one-time-secret', id: 'token-1' })
    await flushPromises()
    wrapper.unmount()
  })
})
