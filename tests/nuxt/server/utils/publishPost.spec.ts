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
  return { slug: 'post', title: 'Заголовок', body_md: '# Привет\n\nТекст', ...extra }
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
  test('новый пост: markdown становится HTML, ссылка собирается от адреса сайта', async () => {
    const out = await save(payload())

    expect(out).toEqual({ id: 7, slug: 'post', url: 'https://example.com/blog/post' })

    const values = stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')
    expect(values?.text_ru).toContain('<h1>')
    expect(values?.title_ru).toBe('Заголовок')
    expect(values?.is_published).toBe(true)
  })

  test('lead становится анонсом, без него анонс берётся из текста', async () => {
    await save(payload({ lead: '  Кратко  ' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.excerpt_ru).toBe('Кратко')

    plan(state, { 'insert:post': [[saved]] })
    await save(payload())
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.excerpt_ru).toContain('Текст')
  })

  test('status draft не публикует', async () => {
    await save(payload({ status: 'draft' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.is_published).toBe(false)
  })

  test('раздел, начинающийся с proj, — это проект, всё остальное блог', async () => {
    await save(payload({ section: 'Projects' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.type).toBe('project')

    plan(state, { 'insert:post': [[saved]] })
    await save(payload({ section: 'notes' }))
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.type).toBe('blog')
  })

  test('тот же external_id обновляет запись, а не добавляет вторую', async () => {
    const existing = { id: 3, slug: 'post', external_id: 'ext-1' }
    plan(state, { 'select:post': [[existing], []], 'update:post': [[{ ...saved, id: 3 }]] })

    const out = await save(payload({ external_id: 'ext-1' }))

    expect(out.id).toBe(3)
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'insert:post')).toBe(false)
  })

  test('пост, заведённый в админке, публикатор подхватывает по слагу', async () => {
    plan(state, { 'select:post': [[{ id: 5, slug: 'post', external_id: null }], []], 'update:post': [[{ ...saved, id: 5 }]] })

    const out = await save(payload())

    expect(out.id).toBe(5)
    const where = state.calls.find((c) => `${c.op}:${c.table}` === 'select:post')?.steps.find((s) => s.m === 'where')
    expect(where).toBeTruthy()
  })

  test('слаг занят чужим постом — 409, а не тихая перезапись', async () => {
    plan(state, { 'select:post': [[], [{ id: 9 }]] })
    await expect(save(payload())).rejects.toThrow(/already taken/)
  })

  test('обновление несуществующего id — 404', async () => {
    plan(state, { 'select:post': [[]] })
    await expect(save(payload(), 42)).rejects.toThrow(/not found/i)
  })

  test('база не вернула запись — 500, а не молчаливый успех', async () => {
    plan(state, { 'insert:post': [[]] })
    await expect(save(payload())).rejects.toThrow(/Save failed/)
  })
})

describe('теги', () => {
  test('существующий тег переиспользуется, новый заводится со слагом-транслитом', async () => {
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

  test('связи переписываются целиком: старые снимаются перед вставкой', async () => {
    plan(state, { 'insert:post': [[saved]], 'select:tag': [[{ id: 1, slug: 'rust' }]] })
    await save(payload({ tags: ['Rust'] }))

    const keys = state.calls.map((c) => `${c.op}:${c.table}`)
    expect(keys.indexOf('delete:post_tag')).toBeLessThan(keys.indexOf('insert:post_tag'))
  })

  test('пустой список и мусорные названия не создают тегов', async () => {
    await save(payload({ tags: [] }))
    expect(state.calls.some((c) => c.table === 'tag')).toBe(false)

    plan(state, { 'insert:post': [[saved]] })
    await save(payload({ tags: ['   ', '!!!'] }))
    expect(state.calls.some((c) => c.op === 'insert' && c.table === 'tag')).toBe(false)
  })
})

describe('обложка', () => {
  test('заменяет первую картинку поста', async () => {
    await save(payload({ cover_url: 'https://cdn/img.webp' }))

    expect(stepArg(state.calls, 'insert:image', 'values')).toEqual({ post_id: 7, url: 'https://cdn/img.webp', position: 0 })
  })

  test('без обложки старая снимается, новая не вставляется', async () => {
    await save(payload({ cover_url: null }))

    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'delete:image')).toBe(true)
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'insert:image')).toBe(false)
  })
})

describe('очередь сброса кеша', () => {
  test('пути поста уходят в pending_revalidation', async () => {
    await save(payload())

    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual([
      { path: '/' }, { path: '/blog' }, { path: '/projects' }, { path: '/blog/post' },
    ])
  })
})
