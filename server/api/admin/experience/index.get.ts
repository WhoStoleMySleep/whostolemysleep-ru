import { db } from '~/server/db'

export default defineEventHandler(async () => {
  return db.query.experience.findMany({
    with: { bullets: { orderBy: (b, { asc }) => [asc(b.order)] } },
    orderBy: (e, { asc }) => [asc(e.order)],
  })
})
