import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'

const state = vi.hoisted(() => ({ post: null as Post | null, error: null as null | { statusCode: number }, redirect: vi.fn() }))
mockNuxtImport('useLocale', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)
mockNuxtImport('useRoute', () => () => ({ params: { slug: 'example' } }))
mockNuxtImport('useLocaleData', () => async () => ({ data: ref(state.post), error: ref(state.error) }))
mockNuxtImport('navigateTo', () => state.redirect)

beforeEach(() => {
  state.error = null
  state.redirect.mockReset()
  state.post = {
    id: 1, slug: 'example', type: 'project', title: 'Мой проект', excerpt: 'Зачем он нужен',
    text: '<h2>Мой вклад</h2><p>Описание решения</p>', url: 'https://example.com',
    tags: [{ id: 1, slug: 'nuxt', name: 'Nuxt' }], images: [], is_pinned: false,
    published_at: null, updated_at: '',
  }
})
afterEach(() => vi.restoreAllMocks())

async function mountProject() {
  const { default: Project } = await import('~/pages/projects/[slug].vue')
  return mountSuspended(Project)
}

describe('Страница проекта', () => {
  test('показывает кейс и отслеживает только внешнюю кнопку', async () => {
    const wrapper = await mountProject()
    expect(wrapper.get('h1').text()).toBe('Мой проект')
    expect(wrapper.text()).toContain('Зачем он нужен')
    expect(wrapper.get('.project__body h2').text()).toBe('Мой вклад')
    expect(wrapper.get('.project__tags').text()).toBe('Nuxt')
    const outbound = wrapper.get('[data-metrika-goal="project_open"]')
    expect(outbound.attributes('href')).toBe('https://example.com')
    expect(outbound.attributes('target')).toBe('_blank')
    expect(outbound.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('.project__back').attributes('href')).toBe('/ru/projects')
    wrapper.unmount()
  })

  test('не выводит пустые блоки и не добавляет выдуманный текст', async () => {
    Object.assign(state.post!, { text: '', excerpt: '', tags: [], url: null })
    const wrapper = await mountProject()
    for (const selector of ['.project__intro', '.project__tags', '.project__visit', '.project__story', '.project__gallery', '.project__screen'])
      expect(wrapper.find(selector).exists()).toBe(false)
    expect(wrapper.find('[data-metrika-goal]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('показывает все изображения без дублирования обложки', async () => {
    state.post!.images = [0, 1, 2].map(id => ({ id, position: id, url: `/screen-${id}.png`, alt: `Экран ${id}` }))
    const wrapper = await mountProject()
    expect(wrapper.findAll('figure')).toHaveLength(3)
    expect(wrapper.get('.project__screen--cover img').attributes('src')).toBe('/screen-0.png')
    expect(wrapper.findAll('.project__gallery img').map(image => image.attributes('src'))).toEqual(['/screen-1.png', '/screen-2.png'])
    expect(wrapper.get('.project__gallery img').attributes('loading')).toBe('lazy')
    wrapper.unmount()
  })

  test.each([404, 503])('сохраняет статус ошибки %s вместо подмены на 404', async (statusCode) => {
    state.post = null
    state.error = { statusCode }
    await expect(mountProject()).rejects.toMatchObject({ statusCode })
  })

  test('старая страница проекта в блоге перенаправляет на кейс кодом 301', async () => {
    const { default: BlogPost } = await import('~/pages/blog/[slug].vue')
    const wrapper = await mountSuspended(BlogPost)
    expect(state.redirect).toHaveBeenCalledWith('/ru/projects/example', { redirectCode: 301 })
    wrapper.unmount()
  })

  test('настоящая статья не перенаправляется в проекты', async () => {
    state.post!.type = 'blog'
    const { default: BlogPost } = await import('~/pages/blog/[slug].vue')
    const wrapper = await mountSuspended(BlogPost)
    expect(state.redirect).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
