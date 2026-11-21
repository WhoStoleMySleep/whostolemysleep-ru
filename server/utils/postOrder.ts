import { sql, type SQL } from 'drizzle-orm'
import type { post } from '../db/schema'
import { db } from '../db'

type PostOrderColumns = Pick<typeof post, 'id' | 'is_pinned' | 'pin_order' | 'published_at'>

/** Ручной приоритет действует только на закреплённые; остальные сохраняют порядок по дате. */
export function postListOrder(p: PostOrderColumns): SQL[] {
  return [
    sql`${p.is_pinned} desc`,
    sql`case when ${p.is_pinned} then ${p.pin_order} end asc`,
    sql`${p.published_at} desc nulls last`,
    sql`${p.id} desc`,
  ]
}


const PIN_ORDER_LOCK = 7230461

/** Первый запрос batch-транзакции: следующий statement увидит порядок после предыдущего владельца блокировки. */
export function lockPostOrder() {
  return db.execute(sql`select pg_advisory_xact_lock(${PIN_ORDER_LOCK})`)
}
