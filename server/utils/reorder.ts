import { sql, type SQL } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '../db'

/**
 * Расставляет колонку "order" по позиции id в списке — одним запросом.
 *
 * Перетаскивание в списке меняет порядок сразу у нескольких записей.
 * Отдельный PATCH на каждую означал бы пачку round-trip'ов к Neon (а он
 * ходит по HTTP, где каждый запрос — отдельное соединение) и список,
 * который на полпути остался бы наполовину переставленным.
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

/** Список id из тела запроса. Всё, что не целое число, отбрасывается. */
export function readOrderIds(body: unknown): number[] {
  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids)) {
    throw createError({ statusCode: 400, message: 'ids must be an array' })
  }
  return ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
}
