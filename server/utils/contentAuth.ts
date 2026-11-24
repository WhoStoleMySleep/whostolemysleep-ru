import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '~~/server/db'
import { contentToken } from '~~/server/db/schema'
import { ADMIN_COOKIE, readAdminToken } from './auth'
import { contentEnvironment, requireContentOrigin, requireContentWrites } from './contentInput'
import { hitRateLimit } from './rateLimit'
import type { ContentEnvironment, ContentResource, ContentScope } from '~~/shared/content/types'

/** Actor формируется исключительно из проверенного credential. */
export interface ContentActor { id: string; tokenId: string | null; environment: ContentEnvironment; resources: string[]; scopes: string[] }
type TokenRow = typeof contentToken.$inferSelect
const SECRET_BYTES = 32
const MINUTE_MS = 60 * 1000
const ACTION_LIMITS = { read: 120, plan: 20, apply: 10, control: 20 } as const

/** Хеш секретного credential — единственное его представление в БД. */
export function hashContentSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

/** Криптографическая случайность; секрет возвращается только при создании. */
export function generateContentCredential() {
  return { id: randomUUID(), token: `wms_content_${randomBytes(SECRET_BYTES).toString('base64url')}` }
}

/** Отзыв и срок проверяются при каждом вызове, без кеша credential. */
export function contentTokenActor(row: TokenRow | undefined, environment: ContentEnvironment): ContentActor {
  if (!row || row.environment !== environment || row.revoked_at || Date.parse(row.expires_at) <= Date.now() || !Number.isFinite(Date.parse(row.expires_at))) {
    throw createError({ statusCode: 401, message: 'Invalid or expired content token' })
  }
  return { id: `token:${row.id}`, tokenId: row.id, environment, resources: row.resources, scopes: row.scopes }
}

/** Admin cookie не принимается на Bearer API, и publish credentials здесь не действуют. */
export async function requireContentBearer(event: H3Event): Promise<ContentActor> {
  const environment = contentEnvironment()
  const header = getRequestHeader(event, 'authorization') ?? ''
  if (!/^Bearer wms_content_[A-Za-z0-9_-]{43}$/.test(header)) throw createError({ statusCode: 401, message: 'Content Bearer token required' })
  const [row] = await db.select().from(contentToken).where(and(eq(contentToken.secret_hash, hashContentSecret(header.slice('Bearer '.length))), eq(contentToken.environment, environment))).limit(1)
  return contentTokenActor(row, environment)
}

/** У новых admin mutations собственная fail-closed/CSRF граница сверх middleware. */
export async function requireContentAdmin(event: H3Event, mutation = false): Promise<ContentActor> {
  const environment = mutation ? requireContentWrites() : contentEnvironment()
  if (mutation) requireContentOrigin(event)
  const token = getCookie(event, ADMIN_COOKIE)
  if (!token || !await readAdminToken(token)) throw createError({ statusCode: 401, message: 'Admin session required' })
  return { id: 'admin', tokenId: null, environment, resources: [], scopes: [] }
}

/** Админ может проверять чужой план, токен — только собственный. */
export function assertContentOwnership(actor: ContentActor, tokenId: string | null): void {
  if (actor.tokenId && actor.tokenId !== tokenId) throw createError({ statusCode: 403, message: 'Plan belongs to another actor' })
}

/** approve намеренно отсутствует в ContentScope и недоступен любому токену. */
export function assertContentPermission(actor: ContentActor, resource: ContentResource, scope: ContentScope): void {
  if (actor.tokenId && (!actor.resources.includes(resource) || !actor.scopes.includes(scope))) throw createError({ statusCode: 403, message: 'Insufficient content scope' })
}

/** Квоты атомарные и общие для всех серверных экземпляров. */
export async function contentQuota(actor: ContentActor, action: keyof typeof ACTION_LIMITS): Promise<void> {
  const verdict = await hitRateLimit(`content:${actor.environment}:${actor.id}:${action}`, ACTION_LIMITS[action], MINUTE_MS)
  if (!verdict.allowed) throw createError({ statusCode: 429, message: 'Content action quota exceeded' })
}
