import { db } from '~/server/db'
import * as schema from '~/server/db/schema'

export default defineEventHandler(async () => {
  const pending = await db.select().from(schema.pendingRevalidation)
  if (!pending.length) return { ok: true, cleared: [] }

  const paths = pending.map((p) => p.path)

  // Clear Nitro's ISR route cache (works for Node.js / self-hosted deployments).
  // On Vercel CDN edge layer, cached responses expire per isr: N timers in nuxt.config.
  const storage = useStorage('cache')
  const keys    = await storage.getKeys('nitro:handlers')
  await Promise.all(keys.map((k) => storage.removeItem(`cache:nitro:handlers:${k}`)))

  await db.delete(schema.pendingRevalidation)
  return { ok: true, cleared: paths }
})
