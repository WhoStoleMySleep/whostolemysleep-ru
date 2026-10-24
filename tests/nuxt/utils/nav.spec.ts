import { describe, test, expect } from 'vitest'

describe('isNavActive', () => {
  test('home is active only on the root of a locale', async () => {
    const { isNavActive } = await import('~/utils/nav')
    expect(isNavActive('home', '/ru')).toBe(true)
    expect(isNavActive('home', '/en/')).toBe(true)
    expect(isNavActive('home', '/ru/blog')).toBe(false)
  })

  test('a section stays active on its nested pages', async () => {
    const { isNavActive } = await import('~/utils/nav')
    expect(isNavActive('blog', '/en/blog')).toBe(true)
    expect(isNavActive('blog', '/en/blog/some-post')).toBe(true)
    expect(isNavActive('blog', '/en/projects')).toBe(false)
  })
})
