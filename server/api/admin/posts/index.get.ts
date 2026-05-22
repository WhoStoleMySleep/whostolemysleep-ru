import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.query.post.findMany({
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
    orderBy: (p, { desc }) => [desc(p.updated_at)],
  })
})
