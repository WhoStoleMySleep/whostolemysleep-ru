import { describe, test, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

const items = [{ id: 1, pinned: true }, { id: 2, pinned: true }, { id: 3, pinned: false }]

describe('Перестановка закреплённых в общем списке', () => {
  test('без ограничения сохраняет прежнее поведение списка', async () => {
    const { default: Sortable } = await import('~/components/Admin/AdminSortable.vue')
    const wrapper = await mountSuspended(Sortable, { props: { items } })
    expect(wrapper.findAll('.sortable__grip')).toHaveLength(3)
    await wrapper.get('.sortable__grip').trigger('keydown', { key: 'ArrowDown', altKey: true })
    expect(wrapper.emitted('reorder')).toEqual([[[2, 1, 3]]])
    wrapper.unmount()
  })

  test('не сохраняет перетаскивание, если список заблокирован во время движения', async () => {
    const { default: Sortable } = await import('~/components/Admin/AdminSortable.vue')
    const wrapper = await mountSuspended(Sortable, { props: { items, reserveHandle: true } })
    await wrapper.get('.sortable__grip').trigger('dragstart')
    await wrapper.setProps({ disabled: true })
    await wrapper.findAll('.sortable__row')[1]!.trigger('drop')
    expect(wrapper.emitted('reorder')).toBeUndefined()
    expect(wrapper.findAll('.sortable__grip')).toHaveLength(3)
    expect(wrapper.get('.sortable__grip').attributes('aria-disabled')).toBe('true')
    wrapper.unmount()
  })
})
