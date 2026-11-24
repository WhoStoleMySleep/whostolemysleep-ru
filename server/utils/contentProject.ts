import { createHash, randomUUID } from 'node:crypto'
import { sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { db } from '~~/server/db'
import { contentPlan } from '~~/server/db/schema'
import { contentProjectSchema } from '~~/shared/content/schemas'
import type { ChangePlan } from '~~/shared/content/types'
import type { ContentActor } from './contentAuth'
import { assertContentPermission } from './contentAuth'
import { parseContentInput, requireContentWrites } from './contentInput'
import { contentDiff, publicContentPlan } from './contentPlans'
import { contentVersion } from './contentRecords'
import { sanitizeHtml } from './sanitize'

type ProjectInput = z.infer<typeof contentProjectSchema>
interface ProjectTag { id: number | null; slug: string; name: string }
const PLAN_TTL_MINUTES = 30
const PLAN_TTL_MS = PLAN_TTL_MINUTES * 60 * 1000

/** Сервер фиксирует порядок изображений и запрещает публикацию побочным эффектом создания. */
export function prepareProjectContent(input: ProjectInput): Record<string, unknown> {
  const project = parseContentInput(contentProjectSchema, input)
  const text_ru = sanitizeHtml(project.text_ru)
  const text_en = sanitizeHtml(project.text_en)
  if (!text_ru.trim() || !text_en.trim()) throw createError({ statusCode: 400, message: 'Project text is empty after sanitization' })
  return {
    ...project, text_ru, text_en, type: 'project', is_published: false, is_pinned: false, pin_order: 0, published_at: null,
    images: project.images.map((image, position) => ({ ...image, position })),
  }
}

async function projectTags(names: string[]): Promise<ProjectTag[]> {
  if (!names.length) return []
  const result = await db.execute<{ id: number; slug: string; name_ru: string }>(sql`
    select id, slug, name_ru from tag where name_ru in (select jsonb_array_elements_text(${JSON.stringify(names)}::jsonb)) order by id
  `)
  const existing = new Map<string, typeof result.rows[number]>()
  for (const row of result.rows) if (!existing.has(row.name_ru)) existing.set(row.name_ru, row)
  return names.map(name => {
    const row = existing.get(name)
    return { id: row?.id ?? null, slug: row?.slug ?? `mcp-${createHash('sha256').update(name).digest('hex')}`, name }
  })
}

/** Резервируется только sequence ID: до apply ни проекта, ни тегов, ни изображений нет. */
export async function createProjectPlan(actor: ContentActor, input: ProjectInput): Promise<ChangePlan> {
  requireContentWrites()
  assertContentPermission(actor, 'post', 'plan')
  assertContentPermission(actor, 'post', 'create-project')
  const after = prepareProjectContent(input)
  const collision = await db.execute(sql`select id from post where slug = ${after.slug} limit 1`)
  if (collision.rows.length) throw createError({ statusCode: 409, message: 'Project slug already exists' })
  const tags = await projectTags(after.tags as string[])
  const reserved = await db.execute<{ id: number }>(sql`select nextval(pg_get_serial_sequence('post', 'id'))::integer as id`)
  const recordId = reserved.rows[0]!.id
  const expected = { absent: true, tags }
  const [row] = await db.insert(contentPlan).values({
    id: randomUUID(), operation: 'create-project', environment: actor.environment, resource: 'post', record_id: recordId,
    actor: actor.id, token_id: actor.tokenId, version: contentVersion(expected, after), expected_state: expected,
    before: {}, after, diff: contentDiff('post', {}, after), expires_at: new Date(Date.now() + PLAN_TTL_MS).toISOString(),
  }).returning()
  return publicContentPlan(row!)
}

/** Один CTE создаёт весь граф; конфликт уникальности откатывает также теги, изображения и audit. */
export function buildProjectCreateSql(): SQL {
  return sql`${projectInsertSql()}, ${projectRelationsSql()}`
}

function projectInsertSql(): SQL {
  return sql`project_input as materialized (
    select p.*, p.expected_state->'tags' as tags from locked_plan p
    where p.resource = 'post' and p.operation = 'create-project'
  ), existing_tags as materialized (
    select t.id from tag t cross join project_input p
    join lateral jsonb_to_recordset(p.tags) as wanted(id integer, slug text, name text) on true
    where wanted.id = t.id and wanted.slug = t.slug and wanted.name = t.name_ru for share of t
  ), created_project as (
    insert into post(id, slug, type, title_ru, title_en, text_ru, text_en, excerpt_ru, excerpt_en, url, is_published, is_pinned, pin_order, published_at)
    select p.record_id, p.after->>'slug', 'project', p.after->>'title_ru', p.after->>'title_en',
      p.after->>'text_ru', p.after->>'text_en', p.after->>'excerpt_ru', p.after->>'excerpt_en', p.after->>'url', false, false, 0, null
    from project_input p
    where not exists(select 1 from post where id = p.record_id or slug = p.after->>'slug')
      and ${projectTagPreconditions()}
    returning *
  )`
}

function projectRelationsSql(): SQL {
  return sql`created_tags as (
    insert into tag(slug, name_ru, name_en)
    select t.slug, t.name, t.name from project_input p cross join created_project
      cross join lateral jsonb_to_recordset(p.tags) as t(id integer, slug text, name text) where t.id is null
    returning id
  ), linked_tags as (
    insert into post_tag(post_id, tag_id)
    select p.id, t.id from created_project p cross join (select id from created_tags union all select id from existing_tags) t
    returning post_id
  ), created_images as (
    insert into image(post_id, url, alt_ru, alt_en, position)
    select created.id, i.url, i.alt_ru, i.alt_en, i.position from created_project created cross join project_input p
      cross join lateral jsonb_to_recordset(p.after->'images') as i(url text, alt_ru text, alt_en text, position integer)
    returning post_id
  ), updated as materialized (
    select p.* from created_project p cross join (select count(*) from linked_tags) tags cross join (select count(*) from created_images) images
  )`
}

function projectTagPreconditions(): SQL {
  return sql`(select count(*) from existing_tags) = (select count(*) from jsonb_to_recordset(p.tags) as t(id integer) where t.id is not null)
    and not exists (
      select 1 from jsonb_to_recordset(p.tags) as wanted(id integer, name text)
      join tag live on live.name_ru = wanted.name where wanted.id is null
    )`
}
