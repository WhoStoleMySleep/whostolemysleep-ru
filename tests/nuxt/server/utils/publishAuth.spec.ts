import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

const event = {} as H3Event

function withHeader(value?: string) {
  vi.stubGlobal('getRequestHeader', () => value)
}

beforeEach(() => {
  vi.stubEnv('PUBLISH_TOKEN', 'right-token')
  withHeader(undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('requirePublishToken', () => {
  test('верный Bearer пропускает', async () => {
    withHeader('Bearer right-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).not.toThrow()
  })

  test('чужой токен — 401', async () => {
    withHeader('Bearer wrong-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('токен короче настоящего тоже 401, а не падение сравнения', async () => {
    // timingSafeEqual требует одинаковой длины — потому сравниваются хеши.
    withHeader('Bearer x')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('без заголовка и без схемы Bearer — 401', async () => {
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)

    withHeader('right-token')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('ненастроенная интеграция — 503, а не «неверный токен»', async () => {
    vi.stubEnv('PUBLISH_TOKEN', '')
    withHeader('Bearer right-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/not configured/)
  })
})
