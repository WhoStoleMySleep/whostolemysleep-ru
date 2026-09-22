import { describe, test, expect, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'
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
  title: 'Title',
  text: '',
  excerpt: 'Summary',
  url: null,
  tags: [],
  images: [],
  published_at: '2024-02-09',
  updated_at: '2024-02-09',
  ...fields,
})

describe('UiCard', () => {
  test('an internal entry links to the blog page and opens in the same window', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post() } })
    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe('/ru/blog/hello')
    expect(link.attributes('target')).toBeUndefined()
  })

  test('an external project opens in a new tab with a protective rel', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ url: 'https://github.com/user/repo' }) },
    })
    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe('https://github.com/user/repo')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  test('the host without www is shown instead of the full address', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ url: 'https://www.example.com/a/b?c=1' }) },
    })
    expect(wrapper.text()).toContain('example.com ↗')
  })

  test('a broken url does not break the card — there is simply no link caption', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ url: 'not a url' }) } })
    expect(wrapper.find('.card__link').exists()).toBe(false)
  })

  test('the first tag replaces the section caption', async () => {
    const wrapper = await mountSuspended(UiCard, {
      props: { item: post({ tags: [{ id: 1, slug: 'rust', name: 'Rust' }] }) },
    })
    expect(wrapper.get('.card__tag').text()).toBe('Rust')
  })

  test('with no tags the section captions itself', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ type: 'project' }) } })
    expect(wrapper.get('.card__tag').text()).toBe('card.project')
  })

  test('with no publication date the date block is not rendered', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post({ published_at: null }) } })
    expect(wrapper.find('.card__date').exists()).toBe(false)
  })

  test('the date is shown in the locale format', async () => {
    const wrapper = await mountSuspended(UiCard, { props: { item: post() } })
    expect(wrapper.get('.card__date').text()).toBe('09.02.2024')
  })
})
