import { skill } from '~~/server/db/schema'
import { applyOrder, readOrderIds } from '~~/server/utils/reorder'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const ids = readOrderIds(await readBody(event))
  await applyOrder(skill, ids)
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
