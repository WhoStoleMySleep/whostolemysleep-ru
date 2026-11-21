import { sql, type SQL } from 'drizzle-orm'
import type { post } from '../db/schema'

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
