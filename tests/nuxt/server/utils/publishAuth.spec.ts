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
  test('a correct Bearer lets the request through', async () => {
    withHeader('Bearer right-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).not.toThrow()
  })

  test('a foreign token is a 401', async () => {
    withHeader('Bearer wrong-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('a token shorter than the real one is also a 401, not a crash in the comparison', async () => {
    withHeader('Bearer x')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('no header and no Bearer scheme is a 401', async () => {
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)

    withHeader('right-token')
    expect(() => requirePublishToken(event)).toThrow(/Unauthorized/)
  })

  test('an unconfigured integration is a 503, not a wrong token', async () => {
    vi.stubEnv('PUBLISH_TOKEN', '')
    withHeader('Bearer right-token')
    const { requirePublishToken } = await import('~~/server/utils/publishAuth')
    expect(() => requirePublishToken(event)).toThrow(/not configured/)
  })
})
