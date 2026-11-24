import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '~~/server/db'
import { contentPlan } from '~~/server/db/schema'
import { contentPatchSchema, contentRecordSchema, type contentPlanSchema } from '~~/shared/content/schemas'
import type { ChangePlan, ContentDiff, ContentPlanSummary, ContentResource } from '~~/shared/content/types'
import type { ContentActor } from './contentAuth'
import { assertContentOwnership, assertContentPermission } from './contentAuth'
import { parseContentInput, requireContentWrites } from './contentInput'
import { canonicalContent, loadContent } from './contentRecords'
import { sanitizeHtml } from './sanitize'

type PlanRow = typeof contentPlan.$inferSelect
export type ContentPlanInput = z.infer<typeof contentPlanSchema>
const PLAN_TTL_MINUTES = 30
const PLAN_TTL_MS = PLAN_TTL_MINUTES * 60 * 1000
const LIST_LIMIT = 100

/** Преобразует внутренние имена БД, не раскрывая expected_state/credential. */
export function publicContentPlan(row: PlanRow): ChangePlan {
  return { id: row.id, resource: row.resource, recordId: row.record_id, version: row.version, before: row.before, after: row.after, diff: row.diff, expiresAt: row.expires_at, status: row.status }
}

function flattenContent(resource: ContentResource, data: Record<string, unknown>): Record<string, unknown> {
  if (resource !== 'pages') return data
  return Object.fromEntries(Object.entries(data).flatMap(([locale, fields]) => Object.entries(fields as Record<string, string>).map(([field, value]) => [`${locale}.${field}`, value])))
}

/** Дельта страниц адресует каждую строку, а не целый locale map. */
export function contentDiff(resource: ContentResource, before: Record<string, unknown>, after: Record<string, unknown>): ContentDiff[] {
  const left = flattenContent(resource, before)
  const right = flattenContent(resource, after)
  return Object.entries(right).filter(([field, value]) => canonicalContent(left[field]) !== canonicalContent(value)).map(([field, value]) => ({ field, before: left[field], after: value }))
}

function mergeContent(resource: ContentResource, before: Record<string, unknown>, patch: Record<string, unknown>) {
  if (resource !== 'pages') return { ...before, ...patch }
  return Object.fromEntries(['ru', 'en'].map(locale => [locale, { ...before[locale] as object, ...patch[locale] as object }]))
}

/** HTML допустим только в rich text и очищается до preview/approval, а не после него. */
export function prepareContentAfter(resource: ContentResource, before: Record<string, unknown>, patch: unknown): Record<string, unknown> {
  const validated = parseContentInput(contentPatchSchema(resource), patch) as Record<string, unknown>
  const merged = mergeContent(resource, before, validated)
  const after = (resource === 'post' || resource === 'about')
    ? { ...merged, text_ru: sanitizeHtml(String(merged.text_ru)), text_en: sanitizeHtml(String(merged.text_en)) }
    : merged
  return parseContentInput(contentRecordSchema(resource), after) as Record<string, unknown>
}

/** Создание не затрагивает live-данные и всегда требует версию снимка. */
export async function createContentPlan(actor: ContentActor, input: ContentPlanInput): Promise<ChangePlan> {
  requireContentWrites()
  assertContentPermission(actor, input.resource, 'plan')
  const { snapshot, state } = await loadContent(input.resource, input.recordId, actor.environment)
  if (snapshot.version !== input.expectedVersion) throw createError({ statusCode: 409, message: 'Content version conflict' })
  const after = prepareContentAfter(input.resource, snapshot.data, input.patch)
  const diff = contentDiff(input.resource, snapshot.data, after)
  if (!diff.length) throw createError({ statusCode: 400, message: 'Plan has no changes' })
  const [row] = await db.insert(contentPlan).values({
    id: randomUUID(), environment: actor.environment, resource: input.resource, record_id: input.recordId,
    actor: actor.id, token_id: actor.tokenId, version: snapshot.version, expected_state: state,
    before: snapshot.data, after, diff, expires_at: new Date(Date.now() + PLAN_TTL_MS).toISOString(),
  }).returning()
  return publicContentPlan(row!)
}

/** Чужой токен не может прочитать/применить план даже при знании UUID. */
export async function loadContentPlan(actor: ContentActor, planId: string): Promise<PlanRow> {
  const [row] = await db.select().from(contentPlan).where(and(eq(contentPlan.id, planId), eq(contentPlan.environment, actor.environment))).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Content plan not found' })
  assertContentOwnership(actor, row.token_id)
  return row
}

/** Админ загружает полные снимки только выбранного для проверки плана. */
export async function readContentPlan(actor: ContentActor, planId: string): Promise<ChangePlan> {
  assertContentAdminActor(actor)
  return publicContentPlan(await loadContentPlan(actor, planId))
}

/** Список не выбирает большие JSON-поля, включая внутренний expected_state. */
export async function listContentPlans(actor: ContentActor): Promise<ContentPlanSummary[]> {
  assertContentAdminActor(actor)
  return db.select({ id: contentPlan.id, resource: contentPlan.resource, recordId: contentPlan.record_id, expiresAt: contentPlan.expires_at, status: contentPlan.status })
    .from(contentPlan).where(eq(contentPlan.environment, actor.environment)).orderBy(desc(contentPlan.created_at)).limit(LIST_LIMIT)
}

/** Даже внутренний вызов с token actor не получает права approve. */
export function assertContentAdminActor(actor: ContentActor): void {
  if (actor.tokenId || actor.id !== 'admin') throw createError({ statusCode: 403, message: 'Admin approval required' })
}

/** Повторное подтверждение идемпотентно и никогда не применяет план. */
export async function approveContentPlan(actor: ContentActor, planId: string): Promise<ChangePlan> {
  requireContentWrites()
  assertContentAdminActor(actor)
  const plan = await loadContentPlan(actor, planId)
  if (plan.status === 'applied') return publicContentPlan(plan)
  if (Date.parse(plan.expires_at) <= Date.now()) throw createError({ statusCode: 409, message: 'Content plan expired' })
  const [updated] = await db.update(contentPlan).set({ status: 'approved', approved_by: actor.id, approved_at: new Date().toISOString() })
    .where(and(eq(contentPlan.id, planId), eq(contentPlan.environment, actor.environment), eq(contentPlan.status, 'pending'), gt(contentPlan.expires_at, new Date().toISOString()))).returning()
  return publicContentPlan(updated ?? await loadContentPlan(actor, planId))
}
