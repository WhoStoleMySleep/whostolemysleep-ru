import { describe, test, expect } from 'vitest'

const row = {
  id: 7, slug: 'hello', type: 'blog' as const, external_id: null,
  title_ru: 'Привет', title_en: 'Hello',
  text_ru: '<p>тело</p>', text_en: '',
  excerpt_ru: 'кратко', excerpt_en: 'short',
  url: null, is_published: true,
  published_at: '2026-09-01 10:00:00', created_at: '2026-09-01 10:00:00', updated_at: '2026-09-02 10:00:00',
  postTags: [{ tag: { id: 1, slug: 'rust', name_ru: 'Раст', name_en: '' } }],
  images:   [{ id: 3, post_id: 7, url: 'https://x/1.png', alt_ru: 'картинка', alt_en: 'picture', position: 0 }],
}

describe('toPostSummary', () => {
  test('a list entry carries no body — that is what keeps list payloads small', async () => {
    const { toPostSummary } = await import('~~/server/utils/publicPost')
    expect(toPostSummary(row, 'en')).not.toHaveProperty('text')
  })

  test('fields come in the requested language, and an empty English one falls back to Russian', async () => {
    const { toPostSummary } = await import('~~/server/utils/publicPost')
    const post = toPostSummary(row, 'en')

    expect(post.title).toBe('Hello')
    expect(post.tags[0]?.name).toBe('Раст')
    expect(post.images[0]?.alt).toBe('picture')
  })

  test('internal columns stay on the server', async () => {
    const { toPostSummary } = await import('~~/server/utils/publicPost')
    const post = toPostSummary(row, 'ru')

    expect(post).not.toHaveProperty('external_id')
    expect(post).not.toHaveProperty('is_published')
    expect(post.images[0]).not.toHaveProperty('post_id')
  })
})

describe('toPost', () => {
  test('the full post adds the body with the same fallback', async () => {
    const { toPost } = await import('~~/server/utils/publicPost')

    expect(toPost(row, 'ru').text).toBe('<p>тело</p>')
    expect(toPost(row, 'en').text).toBe('<p>тело</p>')
  })
})
