import { describe, test, expect } from 'vitest'

describe('slugify', () => {
  test('it transliterates Cyrillic', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Привет мир')).toBe('privet-mir')
  })

  test('it maps multi-letter sounds into Latin', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Щука и жук')).toBe('schuka-i-zhuk')
  })

  test('it drops the hard and soft signs instead of replacing them with a hyphen', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('статья')).toBe('statya')
    expect(slugify('подъезд')).toBe('podezd')
  })

  test('mixed text: Latin letters stay as they are', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Rust и Nuxt')).toBe('rust-i-nuxt')
  })

  test('any run of non-letter characters collapses into a single hyphen', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('a  --  b')).toBe('a-b')
    expect(slugify('C++ / C#')).toBe('c-c')
  })

  test('hyphens at the edges are trimmed', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('  — заголовок — ')).toBe('zagolovok')
  })

  test('an empty string stays empty', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('')).toBe('')
  })

  test('text with neither Latin nor Cyrillic gives an empty slug, not a row of hyphens', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('!!! ???')).toBe('')
  })
})
