import { sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'
import { markDirty, postPaths } from '~~/server/utils/pending'

const MAX_PINNED = 1000

function pinnedIds(body: unknown): number[] {
  const ids = (body as { ids?: unknown } | null)?.ids
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_PINNED || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    throw createError({ statusCode: 400, message: 'ids must contain unique positive integer ids of all pinned entries' })
  }
  return ids
}

async function savePinnedOrder(ids: number[]) {
  const values = sql.join(ids.map((id, index) => sql`(${id}::int, ${index}::int)`), sql`, `)
  // Блокировки берутся до проверки набора: конкурентное открепление не оставит частичный UPDATE.
  const updated = await db.execute(sql`
    with locked_pins as materialized (
      select id from ${post} where is_pinned order by id for update
    ), desired(id, position) as (values ${values})
    update ${post} set pin_order = desired.position
      from desired
     where ${post.id} = desired.id
       and (select count(*) from locked_pins) = ${ids.length}
       and not exists (
         select 1 from locked_pins where id not in (select id from desired)
       )
    returning ${post.id}
  `)
  if (updated.rows.length !== ids.length) throw createError({ statusCode: 409, message: 'Pinned entries changed — refresh the list and try again' })
}

defineRouteMeta({
  openAPI: {
    tags: ['Admin: posts'], summary: 'Set the shared order of all pinned posts and projects',
    security: [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderInput' } } } },
    responses: {
      200: { description: 'Pinned order saved' },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      409: { description: 'The supplied ids no longer match all pinned entries; reload the list' },
    },
  },
})

export default defineEventHandler(async (event) => {
  await savePinnedOrder(pinnedIds(await readBody(event)))
  await markDirty(postPaths())
  return { ok: true }
})
