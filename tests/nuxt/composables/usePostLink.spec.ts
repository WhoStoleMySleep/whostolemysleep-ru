import { describe, test, expect } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Post } from '~/types'

mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)

const post = (fields: Partial<Post>) => ({ id: 1, slug: 'hello', ...fields } as Post)

describe('usePostLink', () => {
  test('an entry with no link points at the blog page inside the locale', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: null }))).toEqual({ href: '/ru/blog/hello', isExternal: false })
  })

  test('a project with its own url points outwards', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: 'https://github.com/x' })))
      .toEqual({ href: 'https://github.com/x', isExternal: true })
  })

  test('an empty string in url is not a link but an unfilled field', async () => {
    const { usePostLink } = await import('~/composables/usePostLink')
    expect(usePostLink().linkFor(post({ url: '' })).isExternal).toBe(false)
  })
})
