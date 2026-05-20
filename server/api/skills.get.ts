import { db } from '../db'

export default defineEventHandler(async () => {
  const result = await db.query.skills.findFirst()
  return result ?? null
})
