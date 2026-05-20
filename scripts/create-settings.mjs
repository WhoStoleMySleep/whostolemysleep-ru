import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

for (const f of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}

const sql = neon(process.env.POSTGRES_PRISMA_URL)

await sql`
  CREATE TABLE IF NOT EXISTS "settings" (
    "id" integer PRIMARY KEY DEFAULT 1,
    "open_to_work" boolean NOT NULL DEFAULT true,
    "show_search" boolean NOT NULL DEFAULT true,
    "github_url" text NOT NULL DEFAULT '',
    "telegram_url" text NOT NULL DEFAULT '',
    "email" text NOT NULL DEFAULT '',
    "updated_at" timestamp NOT NULL DEFAULT now()
  )
`

await sql`
  INSERT INTO "settings" ("id", "github_url", "telegram_url", "email")
  VALUES (1, 'https://github.com/WhoStoleMySleepDev', 'https://t.me/WhoStoleMySleepDev', 'whostolemysleep@gmail.com')
  ON CONFLICT ("id") DO NOTHING
`

console.log('Done: settings table created and seeded')
