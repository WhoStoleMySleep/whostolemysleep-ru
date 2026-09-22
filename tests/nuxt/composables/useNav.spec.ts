import { describe, test, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useLocale', () => () => ({ t: (key: string) => `[${key}]` }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path === '/' ? '' : path}`)

describe('useNav', () => {
  test('five items in a fixed order — the numbering depends on it', async () => {
    const { useNav } = await import('~/composables/useNav')
    const items = useNav().value

    expect(items.map((i) => i.key)).toEqual(['home', 'blog', 'projects', 'resume', 'contacts'])
    expect(items.map((i) => i.num)).toEqual(['00', '01', '02', '03', '04'])
  })

  test('captions come from the translations, links carry the language prefix', async () => {
    const { useNav } = await import('~/composables/useNav')
    const items = useNav().value

    expect(items[0]).toMatchObject({ label: '[nav.home]', to: '/ru' })
    expect(items[1]?.to).toBe('/ru/blog')
  })
})
