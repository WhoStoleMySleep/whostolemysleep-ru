import { db } from '../../db'
import { eq } from 'drizzle-orm'
import { inform } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')

  if (type !== 'experience' && type !== 'education') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const result = await db.query.inform.findMany({
    where: eq(inform.type, type),
    with: { InformDetails: true },
    orderBy: (i, { desc }) => [desc(i.date)],
  })

  return result
})
