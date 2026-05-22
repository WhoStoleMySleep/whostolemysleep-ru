import { db } from '~~/server/db'

export default defineEventHandler(async () => {
  return db.query.skillGroup.findMany({
    with: { skills: { orderBy: (s, { asc }) => [asc(s.order)] } },
    orderBy: (g, { asc }) => [asc(g.order)],
  })
})
