import { describe, test, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

describe('Общий порядок записей', () => {
  test('приоритет учитывается только для закреплённых, затем дата и стабильный id', async () => {
    const { postListOrder } = await import('~~/server/utils/postOrder')
    const { post } = await import('~~/server/db/schema')
    const order = postListOrder(post).map(part => new PgDialect().sqlToQuery(part))
    expect(order.map(part => part.sql)).toEqual([
      '"post"."is_pinned" desc',
      'case when "post"."is_pinned" then "post"."pin_order" end asc',
      '"post"."published_at" desc nulls last',
      '"post"."id" desc',
    ])
    expect(order.flatMap(part => part.params)).toEqual([])
  })
})
