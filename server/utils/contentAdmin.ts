import { and, desc, eq, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '~~/server/db'
import { contentHistory, contentToken } from '~~/server/db/schema'
import type { contentTokenSchema } from '~~/shared/content/schemas'
import type { ContentHistory, ContentResource, ContentTokenInfo } from '~~/shared/content/types'
import type { ContentActor } from './contentAuth'
import { generateContentCredential, hashContentSecret } from './contentAuth'
import { assertContentAdminActor, createContentPlan } from './contentPlans'
import { requireContentWrites } from './contentInput'

const LIST_LIMIT = 100
const DAY_MS = 24 * 60 * 60 * 1000
type TokenRow = typeof contentToken.$inferSelect

function publicToken(row: Pick<TokenRow, 'id' | 'label' | 'resources' | 'scopes' | 'expires_at' | 'revoked_at'>): ContentTokenInfo {
  return { id: row.id, label: row.label, resources: row.resources as ContentTokenInfo['resources'], scopes: row.scopes as ContentTokenInfo['scopes'], expiresAt: row.expires_at, revokedAt: row.revoked_at }
}

/** Все действующие credentials доступны для отзыва; история ограничена и не содержит секретов. */
export async function listContentTokens(actor: ContentActor): Promise<ContentTokenInfo[]> {
  assertContentAdminActor(actor)
  const fields = sql`id, label, resources, scopes, expires_at, revoked_at`
  const result = await db.execute<Pick<TokenRow, 'id' | 'label' | 'resources' | 'scopes' | 'expires_at' | 'revoked_at'>>(sql`
    (select ${fields} from content_token where environment = ${actor.environment}
      and revoked_at is null and expires_at > now() order by created_at desc)
    union all
    (select ${fields} from content_token where environment = ${actor.environment}
      and (revoked_at is not null or expires_at <= now()) order by created_at desc limit ${LIST_LIMIT})
  `)
  return result.rows.map(publicToken)
}

/** Секрет криптографически случаен и существует в ответе только один раз. */
export async function issueContentToken(actor: ContentActor, input: z.infer<typeof contentTokenSchema>): Promise<{ token: string; id: string }> {
  requireContentWrites()
  assertContentAdminActor(actor)
  const credential = generateContentCredential()
  await db.insert(contentToken).values({
    id: credential.id, environment: actor.environment, label: input.label, secret_hash: hashContentSecret(credential.token),
    resources: input.resources, scopes: input.scopes, expires_at: new Date(Date.now() + input.expiresInDays * DAY_MS).toISOString(),
  })
  return credential
}

/** Повторный отзыв безопасен; credential другой среды не затрагивается. */
export async function revokeContentToken(actor: ContentActor, id: string): Promise<{ revoked: true }> {
  requireContentWrites()
  assertContentAdminActor(actor)
  await db.update(contentToken).set({ revoked_at: new Date().toISOString() }).where(and(eq(contentToken.id, id), eq(contentToken.environment, actor.environment)))
  return { revoked: true }
}

/** Только публичные before/after, с фильтром записи и среды. */
export async function listContentHistory(actor: ContentActor, resource: ContentResource, recordId: number): Promise<ContentHistory[]> {
  assertContentAdminActor(actor)
  const rows = await db.select().from(contentHistory).where(and(eq(contentHistory.environment, actor.environment), eq(contentHistory.resource, resource), eq(contentHistory.record_id, recordId)))
    .orderBy(desc(contentHistory.created_at)).limit(LIST_LIMIT)
  return rows.map(row => ({ id: row.id, resource: row.resource, recordId: row.record_id, createdAt: row.created_at, before: row.before, after: row.after, actor: row.actor }))
}

/** Восстановление проходит тот же preview/approve/CAS, прямого rollback write нет. */
export async function restoreContentPlan(actor: ContentActor, historyId: string, expectedVersion: string) {
  requireContentWrites()
  assertContentAdminActor(actor)
  const [history] = await db.select().from(contentHistory).where(and(eq(contentHistory.id, historyId), eq(contentHistory.environment, actor.environment))).limit(1)
  if (!history) throw createError({ statusCode: 404, message: 'Content history not found' })
  if (!Object.keys(history.before).length) throw createError({ statusCode: 409, message: 'Project creation cannot be restored as a scalar update' })
  return createContentPlan(actor, { resource: history.resource, recordId: history.record_id, expectedVersion, patch: history.before })
}
