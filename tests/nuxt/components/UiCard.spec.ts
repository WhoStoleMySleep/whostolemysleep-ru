import { describe, test, expect, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'
// Компонент импортируется явно: автоимпорты Nuxt действуют в приложении,
// а не в спеке.
import UiCard from '~/components/Ui/UiCard.vue'

const state = vi.hoisted(() => ({ locale: 'ru' }))

mockNuxtImport('useI18n', () => () => ({
  locale: computed(() => state.locale),
  t:      (key: string) => key,
}))

mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)

const post = (fields: Partial<Post> = {}): Post => ({
  id: 1,
  slug: 'hello',
  type: 'blog',
  title: 'Заголовок',
  text: '',
  excerpt: 'Анонс',
  url: null,
  tags: [],
  images: [],
  published_at: '2024-02-09',
  updated_at: '2024-02-09',
  ...fields,
})

describe('UiCard', () => {
  test('внутренняя запись ведёт на страницу блога и открывается в том же окне', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post() } })
    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe('/ru/blog/hello')
    expect(link.attributes('target')).toBeUndefined()
  })

  test('внешний проект открывается в новой вкладке и с защитным rel', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ url: 'https://github.com/user/repo' }) },
    })
    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe('https://github.com/user/repo')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  test('вместо полного адреса показывается хост без www', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ url: 'https://www.example.com/a/b?c=1' }) },
    })
    expect(wrapper.text()).toContain('example.com ↗')
  })

  test('битый url не роняет карточку — просто нет подписи со ссылкой', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ url: 'не адрес' }) } })
    expect(wrapper.find('.card__link').exists()).toBe(false)
  })

  test('первый тег вытесняет подпись раздела', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ tags: [{ id: 1, slug: 'rust', name: 'Rust' }] }) },
    })
    expect(wrapper.get('.card__tag').text()).toBe('Rust')
  })

  test('без тегов раздел подписывается сам', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ type: 'project' }) } })
    expect(wrapper.get('.card__tag').text()).toBe('card.project')
  })

  test('без даты публикации блок даты не рисуется', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ published_at: null }) } })
    expect(wrapper.find('.card__date').exists()).toBe(false)
  })

  test('дата показывается в формате локали', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post() } })
    expect(wrapper.get('.card__date').text()).toBe('09.02.2024')
  })
})
