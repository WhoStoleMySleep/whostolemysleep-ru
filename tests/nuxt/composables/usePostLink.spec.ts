import { describe, test, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'

mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)

const post = (fields: Partial<Post>) => ({ id: 1, slug: 'hello', ...fields } as Post)

describe('usePostLink', () => {
  test('запись без ссылки ведёт на страницу блога внутри локали', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: null }))).toEqual({ href: '/ru/blog/hello', isExternal: false })
  })

  test('проект со своим url ведёт наружу', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: 'https://github.com/x' })))
      .toEqual({ href: 'https://github.com/x', isExternal: true })
  })

  test('пустая строка в url — не ссылка, а незаполненное поле', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: '' })).isExternal).toBe(false)
  })
})
