import { db } from '../../db'
import { eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')

  if (type !== 'blog' && type !== 'project') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const result = await db.query.products.findMany({
    where: eq(products.type, type),
    with: { tags: true, images: true },
    orderBy: (p, { desc }) => [desc(p.date)],
  })

  return result
})
