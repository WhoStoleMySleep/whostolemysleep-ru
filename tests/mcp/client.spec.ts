// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'

const TOKEN = 'test_token_'.padEnd(64, 'x')

async function setup(fetchImpl = vi.fn(async () => Response.json({ ok: true }))) {
  const { createContentClient } = await import('../../scripts/content/client.mjs')
  return { api: createContentClient({ baseUrl: 'http://127.0.0.1:3000', environment: 'development', token: TOKEN, fetchImpl }), fetchImpl }
}

describe('Сетевой клиент Content MCP', () => {
  test.each([
    ['https://whostolemysleep.ru', 'production'],
    ['http://127.0.0.1:3000', 'development'],
    ['http://localhost:3001/', 'development'],
    ['http://[::1]:3000', 'development'],
  ])('разрешает настроенный origin %s для %s', async (url, environment) => {
    const { validateContentOrigin } = await import('../../scripts/content/client.mjs')
    expect(validateContentOrigin(url, environment)).toBe(new URL(url).origin)
  })

  test.each([
    ['https://whostolemysleep.ru', 'development'], ['http://127.0.0.1:3000', 'production'],
    ['https://other.example', 'production'], ['http://localhost.evil.example', 'development'],
    ['http://127.0.0.1:3000/path', 'development'], ['http://user:pass@localhost:3000', 'development'],
    ['https://whostolemysleep.ru/?token=secret', 'production'], ['https://whostolemysleep.ru/#x', 'production'],
    ['https://whostolemysleep.ru', 'preview'], ['file:///tmp/content', 'development'],
  ])('не отправляет ключ на недопустимый адрес %s (%s)', async (url, environment) => {
    const { validateContentOrigin } = await import('../../scripts/content/client.mjs')
    expect(() => validateContentOrigin(url, environment)).toThrow()
  })

  test('передаёт ключ только в заголовке и запрещает редиректы', async () => {
    const { api, fetchImpl } = await setup()
    await api.snapshot({ resource: 'post', recordId: 7 })
    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3000/api/content/snapshot?resource=post&recordId=7', expect.objectContaining({
      method: 'GET', headers: { Authorization: `Bearer ${TOKEN}` }, redirect: 'error', signal: expect.any(AbortSignal),
    }))
    expect(fetchImpl.mock.calls[0]?.[0]).not.toContain(TOKEN)
  })

  test('применение передаёт только ID плана, не произвольный patch', async () => {
    const { api, fetchImpl } = await setup()
    await api.apply({ planId: 'approved-plan' })
    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3000/api/content/apply', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ planId: 'approved-plan' }),
    }))
  })

  test.each([undefined, '', 'short', 'x'.repeat(257), 'x'.repeat(32) + '\n'])('отклоняет пустой или небезопасный credential', async (token) => {
    const { createContentClient } = await import('../../scripts/content/client.mjs')
    expect(() => createContentClient({ baseUrl: 'http://localhost:3000', environment: 'development', token })).toThrow('CONTENT_API_TOKEN')
  })

  test('не включает серверное тело ошибки или ключ в результат', async () => {
    const fetchImpl = vi.fn(async () => new Response(TOKEN, { status: 403 }))
    const { api } = await setup(fetchImpl)
    await expect(api.apply({ planId: 'pending' })).rejects.toThrow('одобрения в админке')
    await expect(api.records({ resource: 'pages' })).rejects.not.toThrow(TOKEN)
  })

  test('не включает детали транспортной ошибки в результат', async () => {
    const { api } = await setup(vi.fn(async () => { throw new Error(TOKEN) }))
    await expect(api.records({ resource: 'pages' })).rejects.toThrow('Content API недоступен')
  })

  test('не отражает содержимое невалидного JSON', async () => {
    const { api } = await setup(vi.fn(async () => new Response(`secret:${TOKEN}`)))
    await expect(api.records({ resource: 'pages' })).rejects.toThrow('некорректный JSON')
  })

  test('ограничивает объём ответа', async () => {
    const { api } = await setup(vi.fn(async () => new Response('x'.repeat(1024 * 1024 + 1))))
    await expect(api.records({ resource: 'pages' })).rejects.toThrow('слишком большой')
  })

  test('не отправляет слишком большой запрос', async () => {
    const { api, fetchImpl } = await setup()
    await expect(api.plan({ patch: { text_ru: 'x'.repeat(128 * 1024) } })).rejects.toThrow('128 KiB')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
