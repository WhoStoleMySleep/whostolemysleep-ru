import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Readable } from 'node:stream'
import type { H3Event } from 'h3'

beforeEach(() => {
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

function bodyEvent(body: string, headers: Record<string, string> = {}) {
  vi.stubGlobal('getRequestHeader', (_event: unknown, key: string) => ({ 'content-type': 'application/json', ...headers })[key])
  return { node: { req: Readable.from([body]) } } as unknown as H3Event
}

describe('Входная граница content API', () => {
  test.each([undefined, '', 'false', 'TRUE'])('запись закрыта при CONTENT_WRITE_ENABLED=%s', async value => {
    vi.stubEnv('CONTENT_WRITE_ENABLED', value)
    const { requireContentWrites } = await import('~~/server/utils/contentInput')
    expect(() => requireContentWrites()).toThrow('Content writes are disabled')
  })

  test('явная среда обязательна даже вне production', async () => {
    const { requireContentWrites, contentEnvironment } = await import('~~/server/utils/contentInput')
    vi.stubEnv('CONTENT_ENVIRONMENT', undefined)
    expect(() => requireContentWrites()).toThrow('CONTENT_ENVIRONMENT')
    vi.stubEnv('CONTENT_ENVIRONMENT', 'production')
    expect(contentEnvironment()).toBe('production')
    vi.stubEnv('CONTENT_ENVIRONMENT', 'arbitrary')
    expect(() => contentEnvironment()).toThrow()
  })

  test('CSRF требует точный origin и отвергает cross-site', async () => {
    const { requireContentOrigin } = await import('~~/server/utils/contentInput')
    vi.stubGlobal('getRequestURL', () => new URL('http://localhost:3000/api/admin/content/plan'))
    const headers: Record<string, string> = { origin: 'https://evil.test' }
    vi.stubGlobal('getRequestHeader', (_event: unknown, key: string) => headers[key])
    const event = {} as H3Event
    expect(() => requireContentOrigin(event)).toThrow('Same-origin')
    headers.origin = 'http://localhost:3000'
    expect(() => requireContentOrigin(event)).not.toThrow()
    headers['sec-fetch-site'] = 'cross-site'
    expect(() => requireContentOrigin(event)).toThrow()
    delete headers.origin
    expect(() => requireContentOrigin(event)).toThrow()
  })

  test('production принимает https SITE_URL за http TLS proxy, игнорируя evil Host', async () => {
    const { requireContentOrigin } = await import('~~/server/utils/contentInput')
    const { SITE_URL } = await import('~~/shared/utils/site')
    vi.stubEnv('CONTENT_ENVIRONMENT', 'production')
    vi.stubGlobal('getRequestURL', () => new URL('http://evil.test/api/admin/content/plan'))
    vi.stubGlobal('getRequestHeader', (_event: unknown, key: string) => key === 'origin' ? new URL(SITE_URL).origin : undefined)
    expect(() => requireContentOrigin({} as H3Event)).not.toThrow()
    vi.stubGlobal('getRequestHeader', () => 'http://evil.test')
    expect(() => requireContentOrigin({} as H3Event)).toThrow('Same-origin')
  })

  test('preview mutations требуют явный точный https origin', async () => {
    const { requireContentOrigin } = await import('~~/server/utils/contentInput')
    vi.stubEnv('CONTENT_ENVIRONMENT', 'preview')
    vi.stubEnv('CONTENT_ADMIN_ORIGIN', undefined)
    vi.stubGlobal('getRequestHeader', (_event: unknown, key: string) => key === 'origin' ? 'https://preview.test' : undefined)
    expect(() => requireContentOrigin({} as H3Event)).toThrow('CONTENT_ADMIN_ORIGIN')
    for (const invalid of ['http://preview.test', 'https://preview.test/path', 'https://u:p@preview.test', 'https://preview.test?x=1']) {
      vi.stubEnv('CONTENT_ADMIN_ORIGIN', invalid)
      expect(() => requireContentOrigin({} as H3Event)).toThrow('CONTENT_ADMIN_ORIGIN')
    }
    vi.stubEnv('CONTENT_ADMIN_ORIGIN', 'https://preview.test')
    expect(() => requireContentOrigin({} as H3Event)).not.toThrow()
  })

  test('читает JSON и отвергает недопустимые JSON/Content-Type', async () => {
    const { readContentBody } = await import('~~/server/utils/contentInput')
    await expect(readContentBody(bodyEvent('{"a":1}'))).resolves.toEqual({ a: 1 })
    await expect(readContentBody(bodyEvent('{'))).rejects.toThrow('Invalid JSON')
    await expect(readContentBody(bodyEvent('{}', { 'content-type': 'text/plain' }))).rejects.toThrow('JSON body required')
  })

  test('лимит применяется к реальному потоку и declared length', async () => {
    const { readContentBody, CONTENT_BODY_LIMIT } = await import('~~/server/utils/contentInput')
    await expect(readContentBody(bodyEvent('x'.repeat(CONTENT_BODY_LIMIT + 1)))).rejects.toThrow('too large')
    await expect(readContentBody(bodyEvent('{}', { 'content-length': String(CONTENT_BODY_LIMIT + 1) }))).rejects.toThrow('too large')
  })

  test('ошибки runtime-схемы не превращаются в неявное преобразование', async () => {
    const { parseContentInput } = await import('~~/server/utils/contentInput')
    const { contentSelectorSchema } = await import('~~/shared/content/schemas')
    expect(() => parseContentInput(contentSelectorSchema, { resource: 'pages', recordId: '1' })).toThrow('Invalid content input')
    expect(parseContentInput(contentSelectorSchema, { resource: 'pages', recordId: 1 })).toEqual({ resource: 'pages', recordId: 1 })
  })
})
