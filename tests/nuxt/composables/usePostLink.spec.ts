import { describe, test, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'

mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)

const post = (fields: Partial<Post>) => ({ id: 1, slug: 'hello', type: 'blog', ...fields } as Post)

describe('Ссылки на публикации', () => {
  test('статья без URL ведёт на локализованную страницу блога', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: null }))).toEqual({ href: '/ru/blog/hello', isExternal: false })
  })

  test.each([null, '', 'https://github.com/x'])('проект с url=%s ведёт на собственный кейс', async (url) => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ type: 'project', url }))).toEqual({ href: '/ru/projects/hello', isExternal: false })
  })

  test('статья с внешним URL сохраняет прежнее поведение', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: 'https://example.com' }))).toEqual({ href: 'https://example.com', isExternal: true })
  })

  test('пустой URL статьи не считается внешней ссылкой', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: '' })).isExternal).toBe(false)
  })
})
