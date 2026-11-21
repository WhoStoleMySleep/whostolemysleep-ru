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

function groupsForReorder() {
  const groups = structuredClone(initialGroups)
  groups[0]!.skills.push({ id: 20, group_id: 1, name: 'Rust', order: 1 })
  groups.push({
    id: 2, slug: 'backend', name_ru: 'Бэкенд', name_en: 'Backend', order: 1,
    skills: [{ id: 30, group_id: 2, name: 'Node', order: 0 }],
  })
  return groups
}

function pendingReorder(path: string) {
  let reject!: (reason: Error) => void
  mocks.patch.mockImplementation((url: string) => url === path
    ? new Promise((_, fail) => { reject = fail })
    : Promise.resolve({ ok: true }))
  return () => reject(new Error('Reorder failed'))
}

describe('Откат порядка при параллельном редактировании', () => {
  test.each(['rename', 'remove'] as const)('откат навыков сохраняет успешное действие %s', async (action) => {
    const groups = groupsForReorder()
    mocks.get.mockResolvedValueOnce(groups)
    const fail = pendingReorder('/api/admin/skills/items/reorder')
    const wrapper = await mountSkills()
    const frontend = wrapper.findAll('.group')[0]!
    await frontend.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(frontend.findAll('.skill__input').map(input => (input.element as HTMLInputElement).value)).toEqual(['Rust', 'TypeScript'])

    const skill = frontend.findAll('.skill').find(row => (row.get('input').element as HTMLInputElement).value === 'TypeScript')!
    if (action === 'rename') {
      const input = skill.get('input')
      ;(input.element as HTMLInputElement).value = 'JavaScript'
      await input.trigger('change')
    } else {
      await skill.get('.skill__del').trigger('click')
    }
    await flushPromises()
    fail()
    await flushPromises()

    expect(frontend.findAll('.skill__input').map(input => (input.element as HTMLInputElement).value)).toEqual(action === 'rename' ? ['JavaScript', 'Rust'] : ['Rust'])
    expect(groups[0]!.skills.map(item => item.name)).toEqual(['TypeScript', 'Rust'])
    expect(mocks.err).toHaveBeenCalled()
    wrapper.unmount()
  })

  test.each(['rename', 'remove'] as const)('откат групп сохраняет успешное действие %s над навыком', async (action) => {
    const groups = groupsForReorder()
    mocks.get.mockResolvedValueOnce(groups)
    const fail = pendingReorder('/api/admin/skills/groups/reorder')
    const wrapper = await mountSkills()
    await wrapper.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(wrapper.findAll('.group__slug').map(group => group.text())).toEqual(['backend', 'frontend'])

    const frontend = wrapper.findAll('.group')[1]!
    if (action === 'rename') {
      const input = frontend.get('.skill__input')
      ;(input.element as HTMLInputElement).value = 'JavaScript'
      await input.trigger('change')
    } else {
      await frontend.get('.skill__del').trigger('click')
    }
    await flushPromises()
    fail()
    await flushPromises()

    expect(wrapper.findAll('.group__slug').map(group => group.text())).toEqual(['frontend', 'backend'])
    expect(wrapper.findAll('.group')[0]!.findAll('.skill__input').map(input => (input.element as HTMLInputElement).value)).toEqual(action === 'rename' ? ['JavaScript', 'Rust'] : ['Rust'])
    expect(groups[0]!.skills.map(item => item.name)).toEqual(['TypeScript', 'Rust'])
    wrapper.unmount()
  })

  test('откат навыков не теряет новый навык после обновления списка', async () => {
    mocks.get.mockResolvedValueOnce(groupsForReorder())
    const fail = pendingReorder('/api/admin/skills/items/reorder')
    const wrapper = await mountSkills()
    const frontend = wrapper.findAll('.group')[0]!
    await frontend.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    const updated = groupsForReorder()
    updated[0]!.skills = [updated[0]!.skills[1]!, updated[0]!.skills[0]!, { id: 40, group_id: 1, name: 'Vue', order: 2 }]
    mocks.get.mockResolvedValueOnce(updated)
    await frontend.get('.add__input').setValue('Vue')
    await frontend.get('form.add').trigger('submit')
    await flushPromises()
    fail()
    await flushPromises()

    expect(wrapper.findAll('.group')[0]!.findAll('.skill__input').map(input => (input.element as HTMLInputElement).value)).toEqual(['TypeScript', 'Rust', 'Vue'])
    wrapper.unmount()
  })
})
