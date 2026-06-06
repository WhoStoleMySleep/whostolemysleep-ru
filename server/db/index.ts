import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: NeonHttpDatabase<typeof schema> | undefined

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    _db ??= drizzle(neon(process.env.POSTGRES_PRISMA_URL!), { schema })
    return Reflect.get(_db, prop)
  },
})
