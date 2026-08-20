import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Локальная разработка без Neon: адрес HTTP-прокси перед обычным Postgres.
 * В проде переменной нет, и драйвер работает с Neon напрямую.
 */
const localEndpoint = process.env.NEON_LOCAL_SQL_ENDPOINT
if (localEndpoint) {
  neonConfig.fetchEndpoint = localEndpoint
  neonConfig.useSecureWebSocket = false
}

let _db: NeonHttpDatabase<typeof schema> | undefined

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    _db ??= drizzle(neon(process.env.POSTGRES_PRISMA_URL!), { schema })
    return Reflect.get(_db, prop)
  },
})
