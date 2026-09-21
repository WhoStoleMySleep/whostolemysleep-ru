import { diffSnapshot, parseSnapshot } from '~~/server/utils/cv'

/**
 * Что изменится, если применить загруженный файл. Ничего не пишет:
 * список уходит в интерфейс, где каждое изменение подтверждается отдельно.
 */
export default defineEventHandler(async (event) => {
  const body  = await readBody<{ snapshot?: unknown }>(event)
  const input = parseSnapshot(body?.snapshot)
  const bound = await diffSnapshot(input)
  return { changes: bound.map((b) => b.change) }
})
