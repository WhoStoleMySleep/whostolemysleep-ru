import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
mockNuxtImport('useAdminApi', () => () => api)
const tags = [
  { id: 1, slug: 'nuxt', name_ru: 'Nuxt', name_en: 'Nuxt' },
  { id: 2, slug: 'vue', name_ru: 'Вью', name_en: 'Vue' },
]

beforeEach(() => {
  vi.resetAllMocks()
  api.get.mockResolvedValue(tags)
})

async function picker(props: { modelValue?: number[]; disabled?: boolean } = {}) {
  const { default: Picker } = await import('~/components/Admin/AdminTagPicker.vue')
  return mountSuspended(Picker, { props, attachTo: document.body })
}

describe('Компактный выбор тегов', () => {
  test('показывает выбранные чипы, а не форму RU/EN/slug', async () => {
    const wrapper = await picker({ modelValue: [1, 2] })
    expect(wrapper.findAll('.chip')).toHaveLength(2)
    expect(wrapper.findAll('input')).toHaveLength(1)
    await wrapper.get('button[aria-label="Remove tag Nuxt"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[2]])
    wrapper.unmount()
  })

  test('находит тег по английскому названию без учёта регистра', async () => {
    const wrapper = await picker()
    await wrapper.get('input').trigger('focus')
    await wrapper.get('input').setValue('VUE')
    expect(wrapper.findAll('.tag-picker__option').map(button => button.text())).toEqual(['Вью Vue'])
    await wrapper.get('.tag-picker__option').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[2]])
    expect(api.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('Enter выбирает существующий тег, не создавая дубликат', async () => {
    const wrapper = await picker({ modelValue: [1] })
    await wrapper.get('input').setValue('nuxt')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[1]])
    expect(api.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('стрелка переводит фокус на вариант, Escape закрывает список', async () => {
    const wrapper = await picker()
    const input = wrapper.get('input')
    ;(input.element as HTMLInputElement).focus()
    await input.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('.tag-picker__option').element)
    await wrapper.get('.tag-picker__option').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.tag-picker__options').exists()).toBe(false)
    expect(document.activeElement).toBe(input.element)
    wrapper.unmount()
  })

  test('при пустом наборе предлагает создание только после ввода названия', async () => {
    api.get.mockResolvedValueOnce([])
    const wrapper = await picker()
    await wrapper.get('input').trigger('focus')
    expect(wrapper.find('.tag-picker__create').exists()).toBe(false)
    await wrapper.get('input').setValue('Rust')
    expect(wrapper.get('.tag-picker__create').text()).toContain('Rust')
    wrapper.unmount()
  })

  test('во время сохранения записи нельзя менять теги', async () => {
    const wrapper = await picker({ modelValue: [1], disabled: true })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.chip').attributes('disabled')).toBeDefined()
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(api.post).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})


test.each([true, false])('после создания с успехом=%s возвращает фокус и не перечитывает теги при обычной ошибке', async (success) => {
  if (success) api.post.mockResolvedValueOnce({ id: 3, slug: 'rust', name_ru: 'Rust', name_en: '' })
  else api.post.mockRejectedValueOnce(new Error('Network error'))
  const wrapper = await picker()
  const calls = api.get.mock.calls.length
  await wrapper.get('input').setValue('Rust')
  await wrapper.get('input').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  expect(document.activeElement).toBe(wrapper.get('input').element)
  expect(api.get.mock.calls).toHaveLength(calls)
  wrapper.unmount()
})
