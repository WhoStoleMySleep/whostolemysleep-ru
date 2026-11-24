import { randomUUID } from 'node:crypto'
import { sql, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import type { contentPlan } from '~~/server/db/schema'
import { PAGE_DEFAULTS, type PageCopy } from '~~/shared/content/registry'
import { contentFieldNames } from '~~/shared/content/schemas'
import type { ContentActor } from './contentAuth'
import { assertContentPermission } from './contentAuth'
import { requireContentWrites } from './contentInput'
import { CONTENT_TABLES, loadContent } from './contentRecords'
import { loadContentPlan } from './contentPlans'
import { markDirty, postPaths, resumePaths, sitePaths } from './pending'

type PlanRow = typeof contentPlan.$inferSelect

function pageOverrides(data: Record<string, unknown>): PageCopy {
  return Object.fromEntries(['ru', 'en'].map(locale => [locale, Object.fromEntries(Object.entries(data[locale] as Record<string, string>).filter(([field, value]) => value !== PAGE_DEFAULTS[locale as keyof PageCopy][field]))])) as PageCopy
}

function assignments(plan: PlanRow): SQL {
  if (plan.resource === 'pages') return sql`data = ${JSON.stringify(pageOverrides(plan.after))}::jsonb, updated_at = clock_timestamp()`
  const fields = contentFieldNames(plan.resource).map(field => sql`${sql.identifier(field)} = ${plan.after[field]}`)
  if (['post', 'about', 'settings'].includes(plan.resource)) fields.push(sql`updated_at = clock_timestamp()`)
  return sql.join(fields, sql`, `)
}

function callerTokenSql(actor: ContentActor, plan: PlanRow): SQL {
  return sql`caller_token as materialized (
    select t.id from content_token t where t.id = ${actor.tokenId}::uuid
      and t.environment = ${actor.environment} and t.revoked_at is null and t.expires_at > now()
      and t.resources ? ${plan.resource} and t.scopes ? 'apply' for share
  )`
}

function lockedPlanSql(actor: ContentActor, plan: PlanRow): SQL {
  const owner = actor.tokenId ? sql`and p.token_id = ${actor.tokenId}::uuid and exists(select 1 from caller_token)` : sql``
  return sql`source_token as materialized (
    select t.id from content_token t where t.id = ${plan.token_id}::uuid
      and t.environment = ${actor.environment} and t.revoked_at is null and t.expires_at > now()
      and t.resources ? ${plan.resource} and t.scopes ? 'plan' for share
  ), locked_plan as materialized (
    select p.* from content_plan p where p.id = ${plan.id}::uuid
      and p.environment = ${actor.environment} and p.status = 'approved'
      and p.approved_by = 'admin' and p.expires_at > now() ${owner}
      and (p.token_id is null or exists(select 1 from source_token))
    for update
  )`
}

function liveUpdateSql(plan: PlanRow): SQL {
  const table = sql.identifier(CONTENT_TABLES[plan.resource].table)
  const key = plan.resource === 'pages' ? 'environment' : 'id'
  const selector = plan.resource === 'pages' ? sql`live.environment = ${plan.environment}` : sql`live.id = ${plan.record_id}`
  return sql`target as materialized (
    select live.${sql.identifier(key)} as key, to_jsonb(live) = p.expected_state as matches
    from ${table} live cross join locked_plan p where ${selector} for update of live
  ), updated as (
    update ${table} live set ${assignments(plan)} from target
    where live.${sql.identifier(key)} = target.key and target.matches returning live.*
  )`
}

function auditSql(actor: ContentActor): SQL {
  return sql`audit as (
    insert into content_history(id, environment, plan_id, resource, record_id, actor, approved_by, before, after)
    select ${randomUUID()}::uuid, p.environment, p.id, p.resource, p.record_id, ${actor.id}, p.approved_by, p.before, p.after
    from locked_plan p where exists(select 1 from updated) returning plan_id
  ), applied as (
    update content_plan p set status = 'applied', applied_at = clock_timestamp()
    from audit where p.id = audit.plan_id returning p.id
  ) select id from applied`
}

/** Один statement: row locks + CAS + live update + audit + status; нет update без истории. */
export function buildContentApplySql(actor: ContentActor, plan: PlanRow): SQL {
  return sql`with ${callerTokenSql(actor, plan)}, ${lockedPlanSql(actor, plan)}, ${liveUpdateSql(plan)}, ${auditSql(actor)}`
}

async function refreshContent(plan: PlanRow): Promise<void> {
  try {
    const paths = plan.resource === 'post' ? [...postPaths(plan.before as Parameters<typeof postPaths>[0]), ...postPaths(plan.after as Parameters<typeof postPaths>[0])]
      : ['experience', 'education', 'skill', 'skill-group'].includes(plan.resource) ? resumePaths() : await sitePaths()
    await markDirty(paths)
  } catch (error) { console.error('Content committed; cache refresh needs retry', error) }
}

function requireApprovedPlan(plan: PlanRow): void {
  if (plan.status !== 'approved' || plan.approved_by !== 'admin') throw createError({ statusCode: 409, message: 'Content plan requires admin approval' })
  if (Date.parse(plan.expires_at) <= Date.now()) throw createError({ statusCode: 409, message: 'Content plan expired' })
}

/** Повторный apply своего уже применённого плана не создаёт второй audit. */
export async function applyContentPlan(actor: ContentActor, planId: string): Promise<{ status: 'applied'; planId: string }> {
  requireContentWrites()
  const plan = await loadContentPlan(actor, planId)
  assertContentPermission(actor, plan.resource, 'apply')
  if (plan.status === 'applied') return { status: 'applied', planId }
  requireApprovedPlan(plan)
  const current = await loadContent(plan.resource, plan.record_id, actor.environment)
  if (current.snapshot.version !== plan.version) throw createError({ statusCode: 409, message: 'Content version conflict' })
  const result = await db.execute<{ id: string }>(buildContentApplySql(actor, plan))
  if (!result.rows.length && (await loadContentPlan(actor, planId)).status !== 'applied') throw createError({ statusCode: 409, message: 'Content conflict, expired plan, or revoked source token' })
  await refreshContent(plan)
  return { status: 'applied', planId }
}
