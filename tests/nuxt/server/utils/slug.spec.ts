import { describe, test, expect } from 'vitest'

describe('slugify', () => {
  test('транслитерирует кириллицу', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Привет мир')).toBe('privet-mir')
  })

  test('склеивает многобуквенные звуки в латиницу', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Щука и жук')).toBe('schuka-i-zhuk')
  })

  test('выбрасывает твёрдый и мягкий знаки, а не заменяет их дефисом', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('статья')).toBe('statya')
    expect(slugify('подъезд')).toBe('podezd')
  })

  test('смешанный текст: латиница остаётся как есть', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('Rust и Nuxt')).toBe('rust-i-nuxt')
  })

  test('любая пачка небуквенных символов схлопывается в один дефис', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('a  --  b')).toBe('a-b')
    expect(slugify('C++ / C#')).toBe('c-c')
  })

  test('дефисы по краям срезаются', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('  — заголовок — ')).toBe('zagolovok')
  })

  test('пустая строка остаётся пустой', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('')).toBe('')
  })

  test('текст без латиницы и кириллицы даёт пустой слаг, а не строку из дефисов', async () => {
    const { slugify } = await import('~~/server/utils/slug')
    expect(slugify('!!! ???')).toBe('')
  })
})
