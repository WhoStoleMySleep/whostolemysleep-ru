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

function projectPlan(status: ChangePlan['status'] = 'pending'): ChangePlan {
  const after = {
    slug: 'mcp-project', type: 'project', title_ru: 'Проект из репозитория', title_en: 'Project from repository',
    excerpt_ru: 'Кратко о проекте', excerpt_en: 'Project overview',
    text_ru: '<script>alert("RU")</script>\n## Задача', text_en: '<img src=x onerror=alert("EN")>\n## Solution',
    url: 'https://github.com/example/project?tab=readme&lang=en', published_at: null, is_published: false,
    tags: ['Nuxt', 'PostgreSQL'],
    images: [
      { url: 'https://images.example.com/screen.png?width=1200&format=webp', alt_ru: '<svg onload=alert(1)>', alt_en: 'Project screenshot', position: 0 },
      { url: 'https://cdn.example.org/detail.webp', alt_ru: 'Детали', alt_en: 'Details', position: 1 },
    ],
  }
  return {
    id: 'creation-plan', operation: 'create-project', resource: 'post', recordId: 42,
    version: 'creation-version', before: {}, after,
    diff: [{ field: 'title_ru', before: undefined, after: after.title_ru }],
    expiresAt: '2099-01-01T00:00:00.000Z', status,
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
    if (url.includes('/records?')) return url.includes('resource=post')
      ? [...(mocks.snapshot?.resource === 'post' ? [{ id: mocks.snapshot.recordId, label: 'Созданный проект' }] : [])]
      : [{ id: 1, label: 'Страницы сайта' }]
    if (url.includes('/snapshot?')) {
      if (url.includes('resource=post') && mocks.snapshot?.resource !== 'post') throw new Error('Запись ещё не существует')
      return structuredClone(mocks.snapshot)
    }
    if (url.includes('/history?')) {
      if (url.includes('resource=post') && mocks.snapshot?.resource !== 'post') throw new Error('Запись ещё не существует')
      return structuredClone(mocks.history)
    }
    if (url.endsWith('/plans')) return mocks.plans.map(({ id, operation, resource, recordId, expiresAt, status }) => ({ id, operation, resource, recordId, expiresAt, status }))
    if (url.includes('/plans/')) return structuredClone(mocks.plans.find(plan => url.endsWith(`/${plan.id}`)))
    throw new Error(`Unexpected URL ${url}`)
  })
  mocks.post.mockImplementation(async (url: string, body: { patch?: Parameters<typeof plan>[0], planId?: string }) => {
    if (url.endsWith('/plan')) { const result = plan(body.patch); mocks.plans = [result]; return structuredClone(result) }
    if (url.endsWith('/approve')) return { ...structuredClone(mocks.plans[0]!), status: 'approved' }
    if (url.endsWith('/apply')) {
      const applied = { ...mocks.plans[0]!, status: 'applied' as const }
      mocks.snapshot = { resource: applied.resource, recordId: applied.recordId, version: 'version-2', data: structuredClone(applied.after) }
      if (applied.operation === 'create-project') mocks.history = [{
        id: 'creation-history', resource: 'post', recordId: applied.recordId, createdAt: '2026-11-24',
        before: {}, after: structuredClone(applied.after), actor: 'admin',
      }]
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
    await flushPromises()
    await wrapper.get('[data-action="approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/approve', { planId: 'plan-1' })
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('именно этот diff') }))
    wrapper.unmount()
  })

  test('список содержит только метаданные, полный diff загружается после выбора плана', async () => {
    mocks.plans = [plan()]
    const wrapper = await editor()
    expect(mocks.get.mock.calls.some(([url]) => url.includes('/plans/'))).toBe(false)
    expect(wrapper.find('[data-diff-field="ru.hero.line1"]').exists()).toBe(false)
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await flushPromises()
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/plans/plan-1')
    expect(wrapper.get('[data-diff-field="ru.hero.line1"]').text()).toContain('Новый заголовок')
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('до загрузки полного плана нет diff и действий approve/apply, повторный клик не дублирует запрос', async () => {
    mocks.plans = [plan()]
    const wrapper = await editor()
    const fullPlan = structuredClone(mocks.plans[0]!)
    let resolvePlan!: (value: ChangePlan) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { resolvePlan = resolve }))
    const button = wrapper.get('[aria-label="Планы изменений"] button')
    await button.trigger('click')
    await flushPromises()
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(false)
    expect(wrapper.find('[data-action="approve"]').exists()).toBe(false)
    await button.trigger('click')
    expect(mocks.get.mock.calls.filter(([url]) => url.includes('/plans/'))).toHaveLength(1)
    resolvePlan(fullPlan)
    await flushPromises()
    expect(wrapper.find('[data-action="approve"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('ошибка загрузки полного плана не оставляет ранее выбранный diff доступным для применения', async () => {
    mocks.plans = [plan()]
    const wrapper = await editor()
    const button = wrapper.get('[aria-label="Планы изменений"] button')
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(true)
    mocks.get.mockRejectedValueOnce(new Error('Не удалось загрузить план'))
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Не удалось загрузить план')
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
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
    await flushPromises()
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

  test('изменённая сервером операция после approve не применяется даже при прежнем diff', async () => {
    const wrapper = await editor()
    await editAndPreview(wrapper)
    mocks.post.mockImplementationOnce(async () => ({ ...plan(), operation: 'create-project', status: 'approved' }))
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith('/apply'))).toBe(false)
    expect(wrapper.text()).toContain('План изменился или истёк')
    wrapper.unmount()
  })

  test('явная operation update сохраняет проверку устаревшей версии', async () => {
    mocks.plans = [{ ...plan(), operation: 'update', version: 'old-version' }]
    const wrapper = await editor()
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('План устарел')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('восстановление создаёт только новый план и показывает его diff', async () => {
    mocks.history = [{ id: 'history-1', resource: 'pages', recordId: 1, createdAt: '2026-11-24', before: structuredClone(mocks.snapshot!.data), after: {}, actor: 'admin' }]
    const wrapper = await editor()
    await wrapper.get('[aria-label="История изменений"] button').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/restore-plan', { historyId: 'history-1', expectedVersion: 'version-1' })
    expect(wrapper.find('[data-diff-field="ru.hero.line1"]').exists()).toBe(true)
    expect(mocks.ask).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

async function reviewProject(status: ChangePlan['status'] = 'pending') {
  mocks.plans = [projectPlan(status)]
  const wrapper = await editor()
  expect(wrapper.get('[aria-label="Планы изменений"]').text()).toContain('Создание проекта · черновик')
  await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
  await flushPromises()
  return wrapper
}

function reservedRecordReads() {
  return mocks.get.mock.calls.filter(([url]) => /\/(snapshot|history)\?resource=post&recordId=42$/.test(url))
}

describe('Создание проекта из плана MCP', () => {
  test.each(['pending', 'approved'] as const)('показывает весь проект %s без чтения несуществующей записи и выполнения HTML', async (status) => {
    const wrapper = await reviewProject(status)
    const preview = wrapper.get('[aria-label="Предпросмотр изменений"]')
    expect(preview.get('h2').text()).toBe('Создание проекта · черновик')
    for (const [field, value] of Object.entries(projectPlan().after)) {
      const rendered = preview.get(`[data-diff-field="${field}"]`)
      const expected = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      expect(rendered.findAll('pre')[1]!.element.textContent).toBe(expected)
    }
    expect(preview.findAll('script, img, svg, iframe, a')).toHaveLength(0)
    expect(preview.html()).toContain('&lt;script&gt;')
    expect(preview.html()).toContain('&lt;svg')
    expect(wrapper.get('[aria-label="Запись контента"]').text()).toContain('Новый проект #42 · черновик')
    expect(wrapper.get('[aria-label="История изменений"]').text()).toContain('Запись ещё не создана')
    expect(wrapper.text()).not.toContain('План устарел')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeUndefined()
    expect(reservedRecordReads()).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('повторная проверка и обновление данных не запрашивают snapshot/history зарезервированного ID', async () => {
    const wrapper = await reviewProject()
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find(button => button.text() === 'Обновить данные')!.trigger('click')
    await flushPromises()
    expect(reservedRecordReads()).toHaveLength(0)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('переход из создания к текстам страниц возвращает обычный update-предпросмотр', async () => {
    const wrapper = await reviewProject()
    await wrapper.get('[aria-label="Раздел контента"]').setValue('pages')
    await flushPromises()
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Запись контента"]').element).toHaveProperty('value', '1')
    await editAndPreview(wrapper)
    expect(wrapper.get('[aria-label="Предпросмотр изменений"] h2').text()).toBe('Предпросмотр плана')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeUndefined()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/plan', expect.objectContaining({ resource: 'pages', recordId: 1 }))
    expect(reservedRecordReads()).toHaveLength(0)
    wrapper.unmount()
  })

  test('выбор существующей записи после создания загружает её snapshot и сохраняет stale guard update', async () => {
    const defaultGet = mocks.get.getMockImplementation()!
    const existing: ContentSnapshot = { resource: 'post', recordId: 7, version: 'existing-version', data: { title_ru: 'Существующий проект' } }
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/api/admin/content/records?resource=post') return [{ id: 7, label: 'Существующий проект' }]
      if (url === '/api/admin/content/snapshot?resource=post&recordId=7') return structuredClone(existing)
      if (url === '/api/admin/content/history?resource=post&recordId=7') return []
      return defaultGet(url)
    })
    const wrapper = await reviewProject()
    await wrapper.get('[aria-label="Запись контента"]').setValue('7')
    await flushPromises()
    expect(wrapper.find('[data-action="apply"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Запись ещё не создана')
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/snapshot?resource=post&recordId=7')
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/history?resource=post&recordId=7')
    mocks.plans = [{ ...projectPlan(), operation: 'update', recordId: 7, version: 'stale-version', before: existing.data }]
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[aria-label="Предпросмотр изменений"] h2').text()).toBe('Предпросмотр плана')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('План устарел')
    expect(reservedRecordReads()).toHaveLength(0)
    expect(mocks.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('отдельное approve не создаёт проект и не запрашивает snapshot/history', async () => {
    const wrapper = await reviewProject()
    await wrapper.get('[data-action="approve"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/approve', { planId: 'creation-plan' })
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('не создаёт запись и не публикует') }))
    expect(wrapper.get('[data-action="apply"]').text()).toBe('Применить')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeUndefined()
    expect(reservedRecordReads()).toHaveLength(0)
    expect(mocks.snapshot?.resource).toBe('pages')
    wrapper.unmount()
  })

  test.each(['pending', 'approved'] as const)('после явного apply проекта %s обновляет records/snapshot/history и не публикует', async (status) => {
    const wrapper = await reviewProject(status)
    mocks.get.mockClear()
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('Публикации не будет.') }))
    expect(mocks.post.mock.calls.map(([url]) => url)).toEqual(status === 'pending'
      ? ['/api/admin/content/approve', '/api/admin/content/apply'] : ['/api/admin/content/apply'])
    expect(mocks.post).toHaveBeenLastCalledWith('/api/admin/content/apply', { planId: 'creation-plan' })
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/records?resource=post')
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/snapshot?resource=post&recordId=42')
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/history?resource=post&recordId=42')
    expect(mocks.get).toHaveBeenCalledWith('/api/admin/content/plans')
    expect(wrapper.get('[aria-label="Запись контента"]').text()).toContain('Созданный проект')
    expect(wrapper.get('[aria-label="История изменений"]').text()).toContain('creation-history')
    expect(wrapper.get('[aria-label="История изменений"]').text()).toContain('Восстановление до отсутствующей записи не поддерживается')
    expect(wrapper.find('[aria-label="История изменений"] button').exists()).toBe(false)
    expect(wrapper.get('[data-action="apply"]').text()).toBe('Применён')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(mocks.snapshot?.data.is_published).toBe(false)
    expect(wrapper.text()).not.toContain('План устарел')
    expect(mocks.ok).toHaveBeenCalledWith('Проект создан как черновик. Публикации не было.')
    wrapper.unmount()
  })

  test('отмена apply оставляет проект несуществующим', async () => {
    const wrapper = await reviewProject()
    mocks.ask.mockResolvedValue(false)
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(reservedRecordReads()).toHaveLength(0)
    wrapper.unmount()
  })

  test('истёкший план создания нельзя одобрить или применить', async () => {
    const wrapper = await reviewProject()
    mocks.plans[0]!.expiresAt = '2000-01-01T00:00:00.000Z'
    await wrapper.get('[aria-label="Планы изменений"] button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-action="approve"]').attributes('disabled')).toBeDefined()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(reservedRecordReads()).toHaveLength(0)
    wrapper.unmount()
  })

  test('изменение operation create-project на update после approve требует повторной проверки', async () => {
    const wrapper = await reviewProject()
    mocks.post.mockResolvedValueOnce({ ...projectPlan(), operation: 'update', status: 'approved' })
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/api/admin/content/approve', { planId: 'creation-plan' })
    expect(wrapper.text()).toContain('План изменился или истёк')
    expect(reservedRecordReads()).toHaveLength(0)
    wrapper.unmount()
  })

  test('конфликт создания не читает несуществующий проект и блокирует повторный apply', async () => {
    const wrapper = await reviewProject('approved')
    mocks.post.mockRejectedValueOnce({ statusCode: 409 })
    await wrapper.get('[data-action="apply"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Конфликт версий')
    expect(wrapper.get('[data-action="apply"]').attributes('disabled')).toBeDefined()
    expect(reservedRecordReads()).toHaveLength(0)
    expect(mocks.ok).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
