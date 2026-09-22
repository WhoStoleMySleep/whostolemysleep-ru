import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { PublishPayload, PublishResult } from '~~/server/utils/publishPost'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const TOKEN = 'publisher-token'
const event = {} as H3Event

// setResponseStatus приходит автоимпортом Nuxt, а не глобалью Nitro.
const res = vi.hoisted(() => ({ status: 200 }))
mockNuxtImport('setResponseStatus', () => (_e: unknown, code: number) => { res.status = code })

function nitro(body?: unknown, opts: { token?: string, id?: string } = {}) {
  res.status = 200
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('getRouterParam', () => opts.id)
  vi.stubGlobal('getRequestIP', () => '1.2.3.4')
  vi.stubGlobal('getRequestHeader', (_e: unknown, name: string) =>
    (name.toLowerCase() === 'authorization' && opts.token ? `Bearer ${opts.token}` : undefined))
}

async function call(path: string, body?: unknown, opts: { token?: string, id?: string } = {}) {
  nitro(body, { token: TOKEN, ...opts })
  const mod = await import(/* @vite-ignore */ path)
  return (mod.default as (e: H3Event) => Promise<unknown>)(event)
}

const create = (body: unknown, opts?: { token?: string }) =>
  call('~~/server/api/publish/posts/index.post', body, opts) as Promise<PublishResult>

const update = (id: string, body: unknown) =>
  call('~~/server/api/publish/posts/[id].put', body, { id }) as Promise<PublishResult>

function payload(extra: Partial<PublishPayload> = {}): PublishPayload {
  return { slug: 'novyy-post', title: 'Новый пост', body_md: '# Заголовок\n\nТекст поста', ...extra }
}

/** Счётчик запросов публикатора: по умолчанию далеко от лимита. */
function quota(count: number) {
  return { 'insert:rate_limit': [[{ key: 'publish:1.2.3.4', count, reset_at: new Date(Date.now() + 600_000).toISOString() }]] }
}

const created = { id: 42, slug: 'novyy-post', external_id: 'ext-1' }

beforeEach(() => {
  plan(state, { ...quota(1), 'insert:post': [[created]], 'update:post': [[created]] })
  vi.stubEnv('PUBLISH_TOKEN', TOKEN)
  vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://example.com/')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('публикация: создание → повторная отправка → обновление', () => {
  test('новый пост создаётся, ответ 201 со ссылкой на страницу', async () => {
    const out = await create(payload({ external_id: 'ext-1', tags: ['Rust'], cover_url: 'https://cdn/c.webp' }))

    expect(res.status).toBe(201)
    expect(out).toEqual({ id: 42, slug: 'novyy-post', url: 'https://example.com/blog/novyy-post' })
    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:post', 'values')?.text_ru).toContain('<h1>')
  })

  test('повторная отправка того же external_id обновляет запись', async () => {
    plan(state, { ...quota(2), 'select:post': [[created], []], 'update:post': [[created]] })

    const out = await create(payload({ external_id: 'ext-1' }))

    expect(out.id).toBe(42)
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'insert:post')).toBe(false)
  })

  test('обновление по id проходит тем же путём', async () => {
    plan(state, { ...quota(3), 'select:post': [[created], []], 'update:post': [[created]] })

    const out = await update('42', payload({ title: 'Правленый заголовок' }))

    expect(out.slug).toBe('novyy-post')
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:post', 'set')?.title_ru).toBe('Правленый заголовок')
  })

  test('несуществующий id — 404', async () => {
    plan(state, { ...quota(1), 'select:post': [[]] })
    await expect(update('999', payload())).rejects.toThrow(/not found/i)
  })

  test('нечисловой id — 400, до базы дело не доходит', async () => {
    await expect(update('abc', payload())).rejects.toThrow(/Invalid id/)
    expect(state.calls.some((c) => c.table === 'post')).toBe(false)
  })

  test('слаг чужого поста — 409, а не перезапись', async () => {
    plan(state, { ...quota(1), 'select:post': [[], [{ id: 7 }]] })
    await expect(create(payload())).rejects.toThrow(/already taken/)
  })
})

describe('доступ и лимиты', () => {
  test('без токена — 401 и ничего не пишется', async () => {
    await create(payload()).catch(() => {})
    plan(state, quota(1))

    await expect(create(payload(), { token: undefined })).rejects.toThrow(/Unauthorized/)
    expect(state.calls.some((c) => c.table === 'post')).toBe(false)
  })

  test('чужой токен — 401', async () => {
    await expect(create(payload(), { token: 'wrong' })).rejects.toThrow(/Unauthorized/)
  })

  test('поток запросов останавливается лимитом раньше проверки токена', async () => {
    plan(state, quota(61))

    await expect(create(payload())).rejects.toThrow(/Too many requests/)
    expect(state.calls.some((c) => c.table === 'post')).toBe(false)
  })

  test('неполное тело — 400', async () => {
    await expect(create({ slug: 'a', title: 'б' })).rejects.toThrow(/required/)

    plan(state, quota(2))
    await expect(create({ title: 'б', body_md: 'текст' })).rejects.toThrow(/required/)
  })
})
