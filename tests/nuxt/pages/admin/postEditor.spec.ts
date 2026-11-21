import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), ok: vi.fn(), err: vi.fn(), guard: vi.fn(),
}))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))
mockNuxtImport('useAdminConfirm', () => () => ({ ask: vi.fn() }))
mockNuxtImport('useUnsavedGuard', () => mocks.guard)
mockNuxtImport('useRoute', () => () => ({ params: { id: 'new' } }))

const tags = [
  { id: 1, slug: 'nuxt', name_ru: 'Nuxt', name_en: 'Nuxt' },
  { id: 2, slug: 'vue', name_ru: 'Vue', name_en: 'Vue' },
]

async function mountEditor() {
  const { default: Editor } = await import('~/pages/admin/posts/[id].vue')
  return mountSuspended(Editor)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue(tags)
  mocks.post.mockResolvedValue({ id: 3, slug: 'rust', name_ru: 'Rust', name_en: 'Rust' })
})

describe('Теги и закрепление в редакторе', () => {
  test('выбор второго тега не снимает первый, повторный клик снимает только выбранный', async () => {
    const wrapper = await mountEditor()
    const chips = wrapper.findAll('.chip')
    await chips[0]!.trigger('click')
    await chips[1]!.trigger('click')
    expect(chips.map(c => c.attributes('aria-pressed'))).toEqual(['true', 'true'])
    await chips[0]!.trigger('click')
    expect(chips.map(c => c.attributes('aria-pressed'))).toEqual(['false', 'true'])
    wrapper.unmount()
  })

  test('создаёт тег и выбирает его, сохраняя прежний выбор', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('.chip').trigger('click')
    await wrapper.get('input[aria-label="New tag RU"]').setValue('Rust')
    await wrapper.get('input[aria-label="New tag EN"]').setValue('Rust')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/api/admin/tags', { name_ru: 'Rust', name_en: 'Rust', slug: '' })
    const selected = wrapper.findAll('.chip[aria-pressed="true"]').map(c => c.text())
    expect(selected).toEqual(['Nuxt', 'Rust'])
    expect(wrapper.get('input[aria-label="New tag RU"]').element).toHaveProperty('value', '')
    wrapper.unmount()
  })

  test('ошибка создания не стирает введённое имя и выбранные теги', async () => {
    mocks.post.mockRejectedValueOnce(new Error('Network error'))
    const wrapper = await mountEditor()
    await wrapper.get('.chip').trigger('click')
    await wrapper.get('input[aria-label="New tag RU"]').setValue('Rust')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.err).toHaveBeenCalled()
    expect(wrapper.get('input[aria-label="New tag RU"]').element).toHaveProperty('value', 'Rust')
    expect(wrapper.findAll('.chip[aria-pressed="true"]')).toHaveLength(1)
    wrapper.unmount()
  })

  test('сохраняет закрепление вместе с несколькими тегами', async () => {
    mocks.post.mockResolvedValueOnce({ id: 7 })
    const wrapper = await mountEditor()
    for (const chip of wrapper.findAll('.chip')) await chip.trigger('click')
    await wrapper.findAll('input[type="checkbox"]')[1]!.setValue(true)
    const save = wrapper.findAll('button').find(button => button.text() === 'Save')!
    await save.trigger('click')
    await flushPromises()
    expect(mocks.post).toHaveBeenCalledWith('/api/admin/posts', expect.objectContaining({ is_pinned: true, tag_ids: [1, 2] }))
    wrapper.unmount()
  })
})


describe('Параллельные действия в редакторе', () => {
  test('создание тега блокирует сохранение и редактирование полей нового тега', async () => {
    let resolve!: (value: unknown) => void
    mocks.post.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = await mountEditor()
    await wrapper.get('input[aria-label="New tag RU"]').setValue('Rust')
    await wrapper.get('form').trigger('submit')
    const save = wrapper.findAll('button').find(button => button.text() === 'Save')!
    expect(save.attributes('disabled')).toBeDefined()
    expect(wrapper.get('input[aria-label="New tag RU"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('input[aria-label="New tag EN"]').attributes('disabled')).toBeDefined()
    const guard = mocks.guard.mock.calls.at(-1)![0] as { save: () => Promise<void> }
    await guard.save()
    expect(mocks.post).toHaveBeenCalledTimes(1)
    resolve({ id: 3, slug: 'rust', name_ru: 'Rust', name_en: '' })
    await flushPromises()
    expect(save.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  test('конфликт обновляет список тегов, не сбрасывая выбор и ввод', async () => {
    const wrapper = await mountEditor()
    await wrapper.get('.chip').trigger('click')
    await wrapper.get('input[aria-label="New tag RU"]').setValue('Rust')
    mocks.get.mockResolvedValueOnce([...tags, { id: 3, slug: 'rust', name_ru: 'Rust', name_en: '' }])
    mocks.post.mockRejectedValueOnce({ statusCode: 409, message: 'Already exists' })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.chip').map(chip => chip.text())).toContain('Rust')
    expect(wrapper.get('.chip[aria-pressed="true"]').text()).toBe('Nuxt')
    expect(wrapper.get('input[aria-label="New tag RU"]').element).toHaveProperty('value', 'Rust')
    wrapper.unmount()
  })

  test('изменение формы во время сохранения не помечается как сохранённое', async () => {
    let resolve!: (value: unknown) => void
    mocks.post.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    const wrapper = await mountEditor()
    await wrapper.findAll('button').find(button => button.text() === 'Save')!.trigger('click')
    await wrapper.get('input[placeholder="my-post-slug"]').setValue('changed-during-save')
    resolve({ id: 7 })
    await flushPromises()
    expect(wrapper.text()).toContain('Unsaved changes')
    wrapper.unmount()
  })
})
