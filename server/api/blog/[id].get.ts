import { db } from '../../db'
import { and, eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const post = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.type, 'blog')),
    with: { tags: true, images: true },
  })

  if (!post) throw createError({ statusCode: 404, message: 'Post not found' })

  return post
})
