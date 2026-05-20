import { db } from '~/server/db'

export default defineEventHandler(async () => {
  return db.query.education.findMany({
    orderBy: (e, { asc }) => [asc(e.order)],
  })
})
