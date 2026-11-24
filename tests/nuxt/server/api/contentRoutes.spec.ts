import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({ actor: vi.fn(), body: vi.fn(), read: vi.fn() }))
vi.mock('~~/server/utils/contentRequest', async importOriginal => ({ ...await importOriginal<object>(), contentRequestActor: mocks.actor, contentRequestBody: mocks.body }))
vi.mock('~~/server/utils/contentRecords', async importOriginal => ({ ...await importOriginal<object>(), readPublicPageContent: mocks.read }))

const routes = [
  { load: () => import('~~/server/api/content/records.get'), admin: false, action: 'read' },
  { load: () => import('~~/server/api/content/snapshot.get'), admin: false, action: 'read' },
  { load: () => import('~~/server/api/content/plan.post'), admin: false, action: 'plan' },
  { load: () => import('~~/server/api/content/apply.post'), admin: false, action: 'apply' },
  { load: () => import('~~/server/api/admin/content/records.get'), admin: true, action: 'read' },
  { load: () => import('~~/server/api/admin/content/snapshot.get'), admin: true, action: 'read' },
  { load: () => import('~~/server/api/admin/content/plan.post'), admin: true, action: 'plan' },
  { load: () => import('~~/server/api/admin/content/apply.post'), admin: true, action: 'apply' },
  { load: () => import('~~/server/api/admin/content/approve.post'), admin: true, action: 'control' },
  { load: () => import('~~/server/api/admin/content/plans.get'), admin: true, action: 'read' },
  { load: () => import('~~/server/api/admin/content/history.get'), admin: true, action: 'read' },
  { load: () => import('~~/server/api/admin/content/restore-plan.post'), admin: true, action: 'plan' },
  { load: () => import('~~/server/api/admin/content/tokens/index.get'), admin: true, action: 'read' },
  { load: () => import('~~/server/api/admin/content/tokens/index.post'), admin: true, action: 'control' },
  { load: () => import('~~/server/api/admin/content/tokens/revoke.post'), admin: true, action: 'control' },
]

beforeEach(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  mocks.actor.mockReset().mockRejectedValue(new Error('Authentication boundary'))
  mocks.body.mockReset()
  mocks.read.mockReset().mockResolvedValue({ ru: {}, en: {} })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Content routes используют нужный credential и общую fail-closed границу', () => {
  test.each(routes)('$admin / $action проверяется до чтения body и content operations', async ({ load, admin, action }) => {
    const handler = (await load()).default
    const event = {} as H3Event
    await expect(handler(event)).rejects.toThrow('Authentication boundary')
    expect(mocks.actor).toHaveBeenCalledWith(event, { admin, action })
    expect(mocks.body).not.toHaveBeenCalled()
  })

  test('публичный endpoint без env не запрашивает БД и возвращает empty overrides', async () => {
    vi.stubEnv('CONTENT_ENVIRONMENT', undefined)
    const handler = (await import('~~/server/api/page-content.get')).default
    expect(await handler({} as H3Event)).toEqual({ ru: {}, en: {} })
    expect(mocks.read).not.toHaveBeenCalled()
  })

  test('public pages использует только доверенную среду и не маскирует ошибки', async () => {
    vi.stubEnv('CONTENT_ENVIRONMENT', 'preview')
    const handler = (await import('~~/server/api/page-content.get')).default
    expect(await handler({} as H3Event)).toEqual({ ru: {}, en: {} })
    expect(mocks.read).toHaveBeenCalledWith('preview')
    mocks.read.mockRejectedValue(new Error('Database offline'))
    await expect(handler({} as H3Event)).rejects.toThrow('Database offline')
    vi.stubEnv('CONTENT_ENVIRONMENT', 'bad-environment')
    expect(() => handler({} as H3Event)).toThrow('CONTENT_ENVIRONMENT')
  })
})
