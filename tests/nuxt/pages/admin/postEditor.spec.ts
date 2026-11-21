import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), ok: vi.fn(), err: vi.fn(),
}))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))
mockNuxtImport('useAdminConfirm', () => () => ({ ask: vi.fn() }))
mockNuxtImport('useUnsavedGuard', () => () => {})
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
    expect(mocks.post).toHaveBeenCalledWith('/api/admin/tags', { name_ru: 'Rust', name_en: 'Rust' })
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
