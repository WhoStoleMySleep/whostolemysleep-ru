import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), remove: vi.fn(), ok: vi.fn(), err: vi.fn(),
}))
mockNuxtImport('useAdminApi', () => () => mocks)
mockNuxtImport('useAdminToast', () => () => ({ ok: mocks.ok, err: mocks.err }))
mockNuxtImport('useAdminConfirm', () => () => ({ ask: vi.fn() }))

const initialGroups = [{
  id: 1,
  slug: 'frontend',
  name_ru: 'Фронтенд',
  name_en: 'Frontend',
  order: 0,
  skills: [{ id: 10, group_id: 1, name: 'TypeScript', order: 0 }],
}]

async function mountSkills() {
  const { default: Skills } = await import('~/pages/admin/skills.vue')
  return mountSuspended(Skills)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.get.mockResolvedValue(structuredClone(initialGroups))
  mocks.patch.mockResolvedValue({ ok: true })
  mocks.remove.mockResolvedValue({ ok: true })
})

describe('Управление навыками', () => {
  test('переименовывает навык без изменения переданной группы', async () => {
    const groups = structuredClone(initialGroups)
    mocks.get.mockResolvedValueOnce(groups)
    const wrapper = await mountSkills()
    const input = wrapper.get('.skill__input')

    await input.setValue('JavaScript')
    await input.trigger('change')
    await flushPromises()

    expect(mocks.patch).toHaveBeenCalledWith('/api/admin/skills/items/10', { name: 'JavaScript' })
    expect(input.element).toHaveProperty('value', 'JavaScript')
    expect(groups[0]?.skills[0]?.name).toBe('TypeScript')
    wrapper.unmount()
  })

  test('удаляет навык из интерфейса без изменения переданной группы', async () => {
    const groups = structuredClone(initialGroups)
    mocks.get.mockResolvedValueOnce(groups)
    const wrapper = await mountSkills()

    await wrapper.get('.skill__del').trigger('click')
    await flushPromises()

    expect(mocks.remove).toHaveBeenCalledWith('/api/admin/skills/items/10')
    expect(wrapper.find('.skill__input').exists()).toBe(false)
    expect(groups[0]?.skills).toHaveLength(1)
    wrapper.unmount()
  })
})
