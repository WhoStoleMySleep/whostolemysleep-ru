import { describe, test, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useLocale', () => () => ({ t: (key: string) => `[${key}]` }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path === '/' ? '' : path}`)

describe('useNav', () => {
  test('пять пунктов в неизменном порядке — на них завязана нумерация', async () => {
    const { useNav } = await import('~/composables/useNav')
    const items = useNav().value

    expect(items.map((i) => i.key)).toEqual(['home', 'blog', 'projects', 'resume', 'contacts'])
    expect(items.map((i) => i.num)).toEqual(['00', '01', '02', '03', '04'])
  })

  test('подписи берутся из переводов, ссылки — с префиксом языка', async () => {
    const { useNav } = await import('~/composables/useNav')
    const items = useNav().value

    expect(items[0]).toMatchObject({ label: '[nav.home]', to: '/ru' })
    expect(items[1]?.to).toBe('/ru/blog')
  })
})
