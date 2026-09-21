import { applyChanges, diffSnapshot, parseSnapshot } from '~~/server/utils/cv'
import { markDirty, resumePaths } from '~~/server/utils/pending'

interface Body {
  snapshot:  unknown
  /** id изменений, которые подтвердил пользователь. */
  accept:    string[]
  /** Правки значений, сделанные прямо в списке: id изменения → новое «после». */
  overrides?: Record<string, string>
}

/**
 * Разница считается на сервере заново, а от клиента приходят только id
 * подтверждённых изменений. Иначе запись в базу задавалась бы телом
 * запроса напрямую — то есть любым полем любой таблицы.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  const accept = new Set(Array.isArray(body?.accept) ? body.accept : [])
  if (!accept.size) return { applied: 0 }

  const input  = parseSnapshot(body?.snapshot)
  const bound  = await diffSnapshot(input)
  const chosen = bound.filter((b) => accept.has(b.change.id))

  for (const b of chosen) {
    const override = body.overrides?.[b.change.id]
    // Править можно только скалярные поля — списки применяются как есть.
    if (override !== undefined && b.change.editable) b.change.after = override
  }

  await applyChanges(chosen)
  await markDirty(resumePaths())

  return { applied: chosen.length, skipped: accept.size - chosen.length }
})
