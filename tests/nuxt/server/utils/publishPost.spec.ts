import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { PublishPayload } from '~~/server/utils/publishPost'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const saved = { id: 7, slug: 'post', external_id: null, type: 'blog' }

function payload(extra: Partial<PublishPayload> = {}): PublishPayload {
  return { slug: 'post', title: 'A title', body_md: '# Hello\n\nBody text', ...extra }
}

async function save(p: PublishPayload, targetId?: number) {
  const { savePublishedPost } = await import('~~/server/utils/publishPost')
  return savePublishedPost(p, targetId)
}

beforeEach(() => {
  plan(state, { 'insert:post': [[saved]], 'update:post': [[saved]] })
  vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://example.com')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('savePublishedPost', () => {
  test('a new post: markdown becomes HTML, the link is built from the site address', async () => {
    const out = await save(payload())

    expect(out).toEqual({ id: 7, slug: 'post', url: 'https://example.com/blog/post' })

    const values = stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')
    expect(values?.text_ru).toContain('<h1>')
    expect(values?.title_ru).toBe('A title')
    expect(values?.is_published).toBe(true)
  })

  test('lead becomes the excerpt; without it the excerpt comes from the body', async () => {
    await save(payload({ lead: '  In brief  ' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.excerpt_ru).toBe('In brief')

    plan(state, { 'insert:post': [[saved]] })
    await save(payload())
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.excerpt_ru).toContain('Body text')
  })

  test('status draft does not publish', async () => {
    await save(payload({ status: 'draft' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.is_published).toBe(false)
  })

  test('a section starting with proj is a project, everything else is the blog', async () => {
    await save(payload({ section: 'Projects' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.type).toBe('project')

    plan(state, { 'insert:post': [[saved]] })
    await save(payload({ section: 'notes' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.type).toBe('blog')
  })

  test('the same external_id updates the entry instead of adding a second one', async () => {
    const existing = { id: 3, slug: 'post', external_id: 'ext-1' }
    plan(state, { 'select:post': [[existing], []], 'update:post': [[{ ...saved, id: 3 }]] })

    const out = await save(payload({ external_id: 'ext-1' }))

    expect(out.id).toBe(3)
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'insert:post')).toBe(false)
  })

  test('a post created in the admin panel is picked up by the publisher through its slug', async () => {
    plan(state, { 'select:post': [[{ id: 5, slug: 'post', external_id: null }], []], 'update:post': [[{ ...saved, id: 5 }]] })

    const out = await save(payload())

    expect(out.id).toBe(5)
    const where = state.calls.find((c) => `${c.op}:${c.table}` === 'select:post')?.steps.find((s) => s.m === 'where')
    expect(where).toBeTruthy()
  })

  test('a slug taken by another post is a 409, not a silent overwrite', async () => {
    plan(state, { 'select:post': [[], [{ id: 9 }]] })
    await expect(save(payload())).rejects.toThrow(/already taken/)
  })

  test('updating a non-existent id is a 404', async () => {
    plan(state, { 'select:post': [[]] })
    await expect(save(payload(), 42)).rejects.toThrow(/not found/i)
  })

  test('the database returned no row — a 500, not a silent success', async () => {
    plan(state, { 'insert:post': [[]] })
    await expect(save(payload())).rejects.toThrow(/Save failed/)
  })
})

describe('tags', () => {
  test('an existing tag is reused, a new one is created with a transliterated slug', async () => {
    plan(state, {
      'insert:post': [[saved]],
      'select:tag':  [[{ id: 1, slug: 'rust', name_ru: 'Rust' }]],
      'insert:tag':  [[{ id: 2, slug: 'zametki' }]],
    })

    await save(payload({ tags: ['Rust', 'Заметки'] }))

    expect(stepArg(state.calls, 'insert:tag', 'values')).toEqual([{ slug: 'zametki', name_ru: 'Заметки' }])
    expect(stepArg(state.calls, 'insert:post_tag', 'values')).toEqual([
      { post_id: 7, tag_id: 1 },
      { post_id: 7, tag_id: 2 },
    ])
  })

  test('the relations are rewritten wholesale: the old ones are dropped before the insert', async () => {
    plan(state, { 'insert:post': [[saved]], 'select:tag': [[{ id: 1, slug: 'rust' }]] })
    await save(payload({ tags: ['Rust'] }))

    const keys = state.calls.map((c) => `${c.op}:${c.table}`)
    expect(keys.indexOf('delete:post_tag')).toBeLessThan(keys.indexOf('insert:post_tag'))
  })

  test('an empty list and junk names create no tags', async () => {
    await save(payload({ tags: [] }))
    expect(state.calls.some((c) => c.table === 'tag')).toBe(false)

    plan(state, { 'insert:post': [[saved]] })
    await save(payload({ tags: ['   ', '!!!'] }))
    expect(state.calls.some((c) => c.op === 'insert' && c.table === 'tag')).toBe(false)
  })
})

describe('cover image', () => {
  test('it replaces the first image of the post', async () => {
    await save(payload({ cover_url: 'https://cdn/img.webp' }))

    expect(stepArg(state.calls, 'insert:image', 'values')).toEqual({ post_id: 7, url: 'https://cdn/img.webp', position: 0 })
  })

  test('with no cover the old one is removed and no new one is inserted', async () => {
    await save(payload({ cover_url: null }))

    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'delete:image')).toBe(true)
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'insert:image')).toBe(false)
  })
})

describe('cache invalidation queue', () => {
  test('the post paths go into pending_revalidation', async () => {
    await save(payload())

    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual([
      { path: '/' }, { path: '/blog' }, { path: '/projects' }, { path: '/blog/post' },
    ])
  })
})
