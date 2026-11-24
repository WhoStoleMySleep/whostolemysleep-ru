import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'
import type { ContentActor } from '~~/server/utils/contentAuth'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), bearer: vi.fn(), quota: vi.fn() }))
vi.mock('~~/server/utils/contentAuth', () => ({ requireContentAdmin: mocks.admin, requireContentBearer: mocks.bearer, contentQuota: mocks.quota }))
const actor: ContentActor = { id: 'admin', tokenId: null, environment: 'development', resources: [], scopes: [] }

beforeEach(() => {
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  mocks.admin.mockReset().mockResolvedValue(actor)
  mocks.bearer.mockReset().mockResolvedValue({ ...actor, id: 'token:one', tokenId: 'one' })
  mocks.quota.mockReset().mockResolvedValue(undefined)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Общая request граница маршрутов', () => {
  test.each(['plan', 'apply', 'control'] as const)('выключенная запись останавливает %s до credential/БД', async action => {
    const { contentRequestActor } = await import('~~/server/utils/contentRequest')
    vi.stubEnv('CONTENT_WRITE_ENABLED', 'false')
    await expect(contentRequestActor({} as H3Event, { admin: true, action })).rejects.toThrow('disabled')
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.bearer).not.toHaveBeenCalled()
    expect(mocks.quota).not.toHaveBeenCalled()
  })

  test('admin mutation вызывает CSRF-aware cookie auth, Bearer API не принимает cookie', async () => {
    const { contentRequestActor } = await import('~~/server/utils/contentRequest')
    const event = {} as H3Event
    await contentRequestActor(event, { admin: true, action: 'plan' })
    expect(mocks.admin).toHaveBeenCalledWith(event, true)
    expect(mocks.quota).toHaveBeenCalledWith(actor, 'plan')
    await contentRequestActor(event, { admin: false, action: 'read' })
    expect(mocks.bearer).toHaveBeenCalledWith(event)
  })

  test('selector query строгий и не допускает parseInt suffix/extra keys', async () => {
    const { contentSnapshotQuery, contentResourceQuery } = await import('~~/server/utils/contentRequest')
    const event = {} as H3Event
    vi.stubGlobal('getQuery', () => ({ resource: 'pages', recordId: '1' }))
    expect(contentSnapshotQuery(event)).toEqual({ resource: 'pages', recordId: 1 })
    for (const recordId of ['1abc', '1.5', '-1', '0', '01', '9007199254740992']) {
      vi.stubGlobal('getQuery', () => ({ resource: 'pages', recordId }))
      expect(() => contentSnapshotQuery(event)).toThrow()
    }
    vi.stubGlobal('getQuery', () => ({ resource: 'user' }))
    expect(() => contentResourceQuery(event)).toThrow()
    vi.stubGlobal('getQuery', () => ({ resource: 'pages', table: 'secret' }))
    expect(() => contentResourceQuery(event)).toThrow()
  })
})
