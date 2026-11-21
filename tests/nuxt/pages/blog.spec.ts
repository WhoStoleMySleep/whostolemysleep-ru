import { describe, test, expect } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

mockNuxtImport('useLocale', () => () => ({ t: (key: string) => key, postCount: (count: number) => String(count) }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)
mockNuxtImport('useLocaleData', () => async () => ({
  pending: ref(false),
  data: ref([true, false].map((is_pinned, id) => ({
    id, is_pinned, title: `Запись ${id}`, slug: `post-${id}`, excerpt: 'Описание',
    type: 'blog', url: null, tags: [], images: [], published_at: null, updated_at: '',
  }))),
}))

describe('Закрепление в блоге', () => {
  test('показывает угловую иконку только у закреплённой записи, без текста в метаданных', async () => {
    const { default: Blog } = await import('~/pages/blog/index.vue')
    const wrapper = await mountSuspended(Blog)
    const rows = wrapper.findAll('.row')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.classes()).toContain('row--pinned')
    expect(rows[0]!.get('.row__pin').attributes('aria-label')).toBe('card.pinned')
    expect(rows[0]!.get('.row__meta').text()).toBe('card.blog')
    expect(rows[1]!.find('.row__pin').exists()).toBe(false)
    expect(rows[1]!.classes()).not.toContain('row--pinned')
    wrapper.unmount()
  })
})
