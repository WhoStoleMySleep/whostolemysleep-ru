import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { PostSummary } from '~/types'

const state = vi.hoisted(() => ({ projects: [] as PostSummary[] }))
mockNuxtImport('useLocale', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)
mockNuxtImport('useSettings', () => async () => ({ data: ref({ years_experience: 5 }) }))
mockNuxtImport('useLocaleData', () => async (url: string) => ({
  data: ref(url === '/api/posts/latest' ? state.projects : null),
}))

function projects(count: number) {
  return Array.from({ length: count }, (_, id): PostSummary => ({
    id, slug: `project-${id}`, title: `Проект ${id}`, excerpt: '', type: 'project',
    url: null, is_pinned: true, tags: [], images: [], published_at: null, updated_at: '',
  }))
}

async function mountHome() {
  const { default: Home } = await import('~/pages/index.vue')
  return mountSuspended(Home)
}

beforeEach(() => { state.projects = projects(8) })

describe('Selected work на главной', () => {
  test.each(['ru', 'en'] as const)('в локали %s есть подписи раскрытия и закрепления', async (locale) => {
    const { readFile } = await import('node:fs/promises')
    const messages = JSON.parse(await readFile(`${process.cwd()}/i18n/locales/${locale}.json`, 'utf8'))
    expect(messages.news.eyebrow).toBe('Selected work')
    expect(messages.news.more).toBeTruthy()
    expect(messages.news.less).toBeTruthy()
    expect(messages.card.pinned).toBeTruthy()
    expect(messages.hero.line1).toContain('Nuxt')
  })

  test('показывает четыре проекта и раскрывает ещё четыре без перехода', async () => {
    const wrapper = await mountHome()
    expect(wrapper.findAll('#selected-work .row')).toHaveLength(4)
    const button = wrapper.get('.work-toggle')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(wrapper.findAll('#selected-work .row')).toHaveLength(8)
    expect(button.attributes('aria-expanded')).toBe('true')
    await button.trigger('click')
    expect(wrapper.findAll('#selected-work .row')).toHaveLength(4)
    wrapper.unmount()
  })

  test.each([1, 4])('при %s проектах кнопки раскрытия нет', async (count) => {
    state.projects = projects(count)
    const wrapper = await mountHome()
    expect(wrapper.findAll('#selected-work .row')).toHaveLength(count)
    expect(wrapper.find('.work-toggle').exists()).toBe(false)
    expect(wrapper.get('.section__more').attributes('href')).toBe('/ru/projects')
    wrapper.unmount()
  })

  test('без закреплений блок скрыт', async () => {
    state.projects = []
    const wrapper = await mountHome()
    expect(wrapper.find('#selected-work').exists()).toBe(false)
    wrapper.unmount()
  })

  test('при неполной второй группе раскрывает только имеющиеся проекты', async () => {
    state.projects = projects(6)
    const wrapper = await mountHome()
    await wrapper.get('.work-toggle').trigger('click')
    expect(wrapper.findAll('#selected-work .row')).toHaveLength(6)
    wrapper.unmount()
  })
})

describe('Цели Метрики на главной', () => {
  test('только внешний проект получает метку события', async () => {
    state.projects = projects(3)
    state.projects[0]!.url = 'https://example.com/project'
    state.projects[1]!.url = 'https://example.com/article'
    state.projects[1]!.type = 'blog'
    const wrapper = await mountHome()
    const links = wrapper.findAll('#selected-work .row')
    expect(links[0]!.attributes('data-metrika-goal')).toBe('project_open')
    expect(links[1]!.attributes('data-metrika-goal')).toBeUndefined()
    expect(links[2]!.attributes('data-metrika-goal')).toBeUndefined()
    wrapper.unmount()
  })
})
