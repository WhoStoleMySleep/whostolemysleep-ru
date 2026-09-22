import { describe, test, expect } from 'vitest'

describe('withLocales', () => {
  test('a path without a locale expands into both — a page has two real routes', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/blog')).toEqual(['/ru/blog', '/en/blog'])
  })

  test('the root becomes /ru and /en, not /ru/', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/')).toEqual(['/ru', '/en'])
  })

  test('a path that already carries a prefix stays single', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/ru/contacts')).toEqual(['/ru/contacts'])
    expect(withLocales('/en')).toEqual(['/en'])
  })

  test('a prefix matches only on a whole segment', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/ruby')).toEqual(['/ru/ruby', '/en/ruby'])
  })
})

describe('postPaths', () => {
  test('with no slug only the lists that any entry changes', async () => {
    const { postPaths } = await import('~~/server/utils/pending')
    expect(postPaths()).toEqual(['/', '/blog', '/projects'])
  })

  test('with a slug the entry page itself is added', async () => {
    const { postPaths } = await import('~~/server/utils/pending')
    expect(postPaths('hello')).toContain('/blog/hello')
  })
})

describe('resumePaths', () => {
  test('the printable version goes stale together with the CV', async () => {
    const { resumePaths } = await import('~~/server/utils/pending')
    expect(resumePaths()).toEqual(['/', '/resume', '/cv'])
  })
})
