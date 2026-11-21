import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), ok: vi.fn(), err: vi.fn() }))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))
mockNuxtImport('useAdminConfirm', () => () => ({ ask: vi.fn() }))
mockNuxtImport('useAdminFormat', () => () => ({ date: (value: string) => value }))

const rows = [
  { id: 1, title_ru: 'Проект', slug: 'project', type: 'project', is_pinned: true, pin_order: 0, is_published: true, updated_at: '' },
  { id: 2, title_ru: 'Статья', slug: 'blog', type: 'blog', is_pinned: true, pin_order: 1, is_published: true, updated_at: '' },
  { id: 3, title_ru: 'Новый проект', slug: 'recent', type: 'project', is_pinned: false, pin_order: 0, is_published: true, updated_at: '' },
]

async function mountList() {
  const { default: List } = await import('~/pages/admin/posts/index.vue')
  return mountSuspended(List, { attachTo: document.body })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.get.mockResolvedValue(rows.map(row => ({ ...row })))
  mocks.patch.mockResolvedValue({ ok: true })
})

describe('Один список записей и проектов', () => {
  test('показывает все записи один раз, ручки есть только у закреплённых', async () => {
    const wrapper = await mountList()
    expect(wrapper.findAll('.sortable')).toHaveLength(1)
    expect(wrapper.findAll('.table__row')).toHaveLength(3)
    expect(wrapper.findAll('.sortable__grip')).toHaveLength(2)
    expect(wrapper.findAll('.pin-toggle')).toHaveLength(3)
    wrapper.unmount()
  })

  test('меняет приоритет проекта и статьи в одном порядке', async () => {
    const wrapper = await mountList()
    await wrapper.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith('/api/admin/posts/reorder', { ids: [2, 1] })
    wrapper.unmount()
  })

  test('не позволяет перетащить закреплённую запись в незакреплённую часть', async () => {
    const wrapper = await mountList()
    await wrapper.findAll('.sortable__grip')[1]!.trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(mocks.patch).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('при поиске скрывает ручки перестановки, сохраняя переключатель закрепления', async () => {
    const wrapper = await mountList()
    await wrapper.get('.bar__search').setValue('Проект')
    expect(wrapper.findAll('.sortable__grip')).toHaveLength(0)
    expect(wrapper.findAll('.pin-toggle')).toHaveLength(2)
    wrapper.unmount()
  })

  test.each([[0, 1, false], [2, 3, true]])('переключает закрепление прямо в строке %s', async (index, id, is_pinned) => {
    const wrapper = await mountList()
    await wrapper.findAll('.pin-toggle')[index]!.trigger('click')
    await flushPromises()
    expect(mocks.patch).toHaveBeenCalledWith(`/api/admin/posts/${id}`, { is_pinned })
    wrapper.unmount()
  })

  test('ошибка перестановки отображается и перечитывает серверный порядок', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('Network error'))
    const wrapper = await mountList()
    const calls = mocks.get.mock.calls.length
    await wrapper.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    await flushPromises()
    expect(mocks.err).toHaveBeenCalledWith('Network error')
    expect(mocks.get.mock.calls.length).toBeGreaterThan(calls)
    wrapper.unmount()
  })
})


test('клавиатурная перестановка сохраняет фокус на той же записи после ответа', async () => {
  const wrapper = await mountList()
  const handle = wrapper.get('.sortable__grip')
  ;(handle.element as HTMLButtonElement).focus()
  mocks.get.mockResolvedValueOnce([rows[1], rows[0], rows[2]])
  await handle.trigger('keydown', { key: 'ArrowDown', altKey: true })
  await flushPromises()
  expect(document.activeElement).toBe(handle.element)
  await handle.trigger('keydown', { key: 'ArrowUp', altKey: true })
  await flushPromises()
  expect(mocks.patch).toHaveBeenLastCalledWith('/api/admin/posts/reorder', { ids: [1, 2] })
  wrapper.unmount()
})
