import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ChangePlan, ContentHistory, ContentSnapshot } from '~~/shared/content/types'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), ask: vi.fn(), ok: vi.fn(), err: vi.fn(), guard: vi.fn(),
  snapshot: null as ContentSnapshot | null, plans: [] as ChangePlan[], history: [] as ContentHistory[],
}))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))
mockNuxtImport('useAdminConfirm', () => () => ({ ask: mocks.ask }))
mockNuxtImport('useUnsavedGuard', () => mocks.guard)

function plan(patch = { ru: { 'hero.line1': 'Новый заголовок' }, en: { 'hero.line1': 'New heading' } }): ChangePlan {
  const before = structuredClone(mocks.snapshot!.data)
  const after = {
    ru: { ...(before.ru as Record<string, string>), ...patch.ru },
    en: { ...(before.en as Record<string, string>), ...patch.en },
  }
  return {
    id: 'plan-1', resource: 'pages', recordId: 1, version: 'version-1', before, after,
    expiresAt: '2099-01-01T00:00:00.000Z', status: 'pending',
    diff: Object.entries(patch).flatMap(([locale, fields]) => Object.entries(fields).map(([key, value]) => ({
      field: `${locale}.${key}`, before: (before[locale] as Record<string, string>)[key], after: value,
    }))),
  }
}

beforeEach(async () => {
  vi.resetAllMocks()
  clearNuxtData()
  const { PAGE_DEFAULTS } = await import('~~/shared/content/registry')
  mocks.snapshot = { resource: 'pages', recordId: 1, version: 'version-1', data: structuredClone(PAGE_DEFAULTS) }
  mocks.plans = []
  mocks.history = []
  mocks.ask.mockResolvedValue(true)
  mocks.get.mockImplementation(async (url: string) => {
    if (url.includes('/records?')) return [{ id: 1, label: 'Страницы сайта' }]
    if (url.includes('/snapshot?')) return structuredClone(mocks.snapshot)
    if (url.includes('/history?')) return structuredClone(mocks.history)
    if (url.endsWith('/plans')) return structuredClone(mocks.plans)
    throw new Error(`Unexpected URL ${url}`)
  })
  mocks.post.mockImplementation(async (url: string, body: { patch?: Parameters<typeof plan>[0], planId?: string }) => {
    if (url.endsWith('/plan')) { const result = plan(body.patch); mocks.plans = [result]; return structuredClone(result) }
    if (url.endsWith('/approve')) return { ...structuredClone(mocks.plans[0]!), status: 'approved' }
    if (url.endsWith('/apply')) {
      const applied = { ...mocks.plans[0]!, status: 'applied' as const }
      mocks.snapshot = { resource: applied.resource, recordId: applied.recordId, version: 'version-2', data: structuredClone(applied.after) }
      mocks.plans = [applied]
      return { status: 'applied', planId: body.planId }
    }
    if (url.endsWith('/restore-plan')) { mocks.plans = [plan()]; return structuredClone(mocks.plans[0]) }
    throw new Error(`Unexpected URL ${url}`)
  })
})

async function editor() {
  const { default: Content } = await import('~/pages/admin/content.vue')
  const wrapper = await mountSuspended(Content)
  await flushPromises()
  return wrapper
}

async function editAndPreview(wrapper: Awaited<ReturnType<typeof editor>>) {
  await wrapper.get('[data-copy-field="ru.hero.line1"]').setValue('Новый заголовок')
  await wrapper.get('[data-copy-field="en.hero.line1"]').setValue('New heading')
  await wrapper.get('[data-action="preview"]').trigger('click')
  await flushPromises()
}

describe('Редактор page-copy и планы MCP', () => {
  test('форма показывает группы RU/EN, а редактирование и preview не публикуют данные', async () => {
    const wrapper = await editor()
    expect(wrapper.text()).toContain('Главная · первый экран')
    await editAndPreview(wrapper)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/api/admin/content/plan', {
      resource: 'pages', recordId: 1, expectedVersion: 'version-1',
      patch: { ru: { 'hero.line1': 'Новый заголовок' }, en: { 'hero.line1': 'New heading' } },
    })
    expect(wrapper.get('[data-diff-field="ru.hero.line1"]').text()).toContain('Nuxt снаружи,')
    expect(wrapper.get('[data-diff-field="ru.hero.line1"]').text()).toContain('Новый заголовок')
    expect(wrapper.get('[data-diff-field="en.hero.line1"]').text()).toContain('New heading')
    expect(mocks.ask).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('только явный клик с подтверждением последовательно approve и apply выбранный diff', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ action: 'Применить' }))
    expect(mocks.post.mock.calls.map(([url]) => url)).toEqual(['/api/admin/content/plan', '/api/admin/content/approve', '/api/admin/content/apply'])
    expect(mocks.post).toHaveBeenLastCalledWith('/api/admin/content/apply', { planId: 'plan-1' })
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('применённый план не помечается устаревшим после обновления версии snapshot', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.snapshot?.version).toBe('version-2')
    expect(wrapper.get('[data-action="apply"]').text()).toBe('Применён')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('План устарел')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-action="preview"]').attributes('disabled')).toBeDefined()
    expect(mocks.ok).toHaveBeenCalledWith('План применён')
    wrapper.unmount()
  })

  test('отмена подтверждения не одобряет и не применяет план', async () => {
    mocks.ask.mockResolvedValue(false)
    const wrapper = await editor()
    await editAndPreview(wrapper)
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  test('дальнейшая правка формы блокирует применение старого preview', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    await wrapper.get('[data-copy-field="ru.hero.line1"]').setValue('Другой заголовок')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Форма изменилась после предпросмотра')
    await wrapper.get('[data-action="apply"]').trigger('click')
    expect(mocks.post).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  test('конфликт при preview сохраняет правки и сообщает о версии', async () => {
    mocks.post.mockRejectedValue({ statusCode: 409 })
    const wrapper = await editor()
    await editAndPreview(wrapper)
    expect(wrapper.text()).toContain('Конфликт версий')
    expect(wrapper.get('[data-copy-field="ru.hero.line1"]').element).toHaveProperty('value', 'Новый заголовок')
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(false)
    expect(mocks.ok).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('503 не выдаётся за сохранение или применение', async () => {
    mocks.post.mockRejectedValue({ response: { status: 503 } })
    const wrapper = await editor()
    await editAndPreview(wrapper)
    expect(wrapper.text()).toContain('Изменения контента отключены')
    expect(mocks.ok).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('план MCP можно одобрить отдельно, не применяя его', async () => {
    mocks.plans = [plan()]
    const wrapper = await editor()
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await wrapper.get('[data-action="approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/approve', { planId: 'plan-1' })
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('именно этот diff') }))
    wrapper.unmount()
  })

  test('изменённый сервером diff после approve никогда не применяется молча', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    mocks.post.mockImplementationOnce(async () => ({ ...plan(), status: 'approved', diff: [{ field: 'ru.hero.line1', before: 'A', after: 'B' }] }))
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/apply'))).toBe(false)
    expect(wrapper.text()).toContain('План изменился или истёк')
    wrapper.unmount()
  })

  test.each(['expired', 'conflict'] as const)('не применяет план MCP: %s', async (reason) => {
    const pending = plan()
    if (reason === 'expired') pending.expiresAt = '2000-01-01T00:00:00.000Z'
    else pending.version = 'old-version'
    mocks.plans = [pending]
    const wrapper = await editor()
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('истечение срока во время подтверждения не отправляет approve или apply', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    let accept!: (value: boolean) => void
    mocks.ask.mockImplementation(() => new Promise(resolve => { accept = resolve }))
    await wrapper.get('[data-action="apply"]').trigger('click')
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2100-01-01T00:00:00.000Z'))
    accept(true)
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    now.mockRestore()
    wrapper.unmount()
  })

  test('конфликт после approve блокирует повторное применение и сохраняет черновик', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    mocks.post.mockImplementationOnce(async () => ({ ...plan(), status: 'approved' }))
      .mockRejectedValueOnce({ statusCode: 409 })
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Конфликт версий')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-copy-field="ru.hero.line1"]').element).toHaveProperty('value', 'Новый заголовок')
    expect(mocks.ok).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('повторный клик во время подтверждения не создаёт вторую цепочку apply', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    let accept!: (value: boolean) => void
    mocks.ask.mockImplementation(() => new Promise(resolve => { accept = resolve }))
    await wrapper.get('[data-action="apply"]').trigger('click')
    await wrapper.get('[data-action="apply"]').trigger('click')
    expect(mocks.ask).toHaveBeenCalledTimes(1)
    accept(true)
    await flushPromises()
    expect(mocks.post.mock.calls.filter(([url]) => url.endsWith('/apply'))).toHaveLength(1)
    wrapper.unmount()
  })

  test('восстановление создаёт только новый план и показывает его diff', async () => {
    mocks.history = [{ id: 'history-1', resource: 'pages', recordId: 1, createdAt: '2026-11-24', before: {}, after: {}, actor: 'admin' }]
    const wrapper = await editor()
    await wrapper.get('[aria-label="История изменений"] button').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/restore-plan', { historyId: 'history-1', expectedVersion: 'version-1' })
    expect(wrapper.find('[data-diff-field="ru.hero.line1"]').exists()).toBe(true)
    expect(mocks.ask).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
