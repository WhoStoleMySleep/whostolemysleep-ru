import { describe, test, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

describe('Иконка закрепления', () => {
  test.each(['Закреплено', 'Pinned'])('имеет доступную подпись и подсказку «%s»', async (label) => {
    const { default: Icon } = await import('~/components/Ui/UiPinnedIcon.vue')
    const wrapper = await mountSuspended(Icon, { props: { label } })
    const icon = wrapper.get('svg')
    expect(icon.attributes('role')).toBe('img')
    expect(icon.attributes('aria-label')).toBe(label)
    expect(icon.get('title').text()).toBe(label)
    expect(icon.attributes('width')).toBe('14')
    expect(icon.attributes('height')).toBe('14')
    expect(icon.find('path').exists()).toBe(true)
    wrapper.unmount()
  })
})
