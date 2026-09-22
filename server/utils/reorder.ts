import { sql, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '../db'

/**
 * Sets the "order" column from the position of each id in the list — in one query.
 *
 * Dragging one item changes the order of several rows at once. A PATCH per row
 * would mean a batch of round trips to Neon (which talks over HTTP, where every
 * request is its own connection) and a list left half-reordered if one of them
 * failed.
 */
export async function applyOrder(table: PgTable, ids: number[]): Promise<void> {
  if (!ids.length) return

  const pairs: SQL[] = ids.map((id, index) => sql`(${id}::int, ${index}::int)`)

  await db.execute(sql`
    UPDATE ${table}
       SET "order" = v.ord
      FROM (VALUES ${sql.join(pairs, sql`, `)}) AS v(id, ord)
     WHERE ${table}.id = v.id
  `)
}

/** The list of ids from the request body. Anything that is not an integer is dropped. */
export function readOrderIds(body: unknown): number[] {
  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids)) {
    throw createError({ statusCode: 400, message: 'ids must be an array' })
  }
  return ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
}
