import { db } from '../db'

export default defineEventHandler(async () => {
  const result = await db.query.aboutMe.findFirst()
  return result ?? null
})
