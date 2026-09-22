import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { count, eq, or, sql } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: dashboard'],
    summary:     'Dashboard counters',
    description: 'Post counters, revalidation queue length, and empty English fields per section.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: {
        description: 'Post counters, revalidation queue length, and gaps in the English version',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                posts:   { type: 'object', properties: { total: { type: 'integer' }, published: { type: 'integer' }, drafts: { type: 'integer' } } },
                pending: { type: 'integer' },
                missing_en: {
                  type: 'object',
                  description: 'Rows whose English fields are empty; total is their sum',
                  properties: {
                    posts:      { type: 'integer' },
                    about:      { type: 'integer' },
                    experience: { type: 'integer' },
                    bullets:    { type: 'integer' },
                    education:  { type: 'integer' },
                    skills:     { type: 'integer' },
                    tags:       { type: 'integer' },
                    total:      { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * Empty English fields per section.
 *
 * The English version is filled in by hand and trails the Russian one: the
 * publisher sends Russian only, and reads fall back to it — so a gap breaks
 * nothing and never announces itself. The dashboard is the one place it shows.
 */
async function missingEn() {
  const rows = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0

  const [posts, about, experience, bullets, education, skills, tags] = await Promise.all([
    rows(db.select({ n: count() }).from(schema.post)
      .where(or(eq(schema.post.title_en, ''), eq(schema.post.text_en, ''), eq(schema.post.excerpt_en, '')))),
    rows(db.select({ n: count() }).from(schema.aboutMe).where(eq(schema.aboutMe.text_en, ''))),
    rows(db.select({ n: count() }).from(schema.experience).where(eq(schema.experience.position_en, ''))),
    rows(db.select({ n: count() }).from(schema.experienceBullet).where(eq(schema.experienceBullet.text_en, ''))),
    rows(db.select({ n: count() }).from(schema.education).where(eq(schema.education.specialization_en, ''))),
    rows(db.select({ n: count() }).from(schema.skillGroup).where(eq(schema.skillGroup.name_en, ''))),
    rows(db.select({ n: count() }).from(schema.tag).where(eq(schema.tag.name_en, ''))),
  ])

  return {
    posts, about, experience, bullets, education, skills, tags,
    total: posts + about + experience + bullets + education + skills + tags,
  }
}

/**
 * Dashboard counters. A separate endpoint because the dashboard used to pull
 * every post with every text and count three numbers on the client.
 */
export default defineEventHandler(async () => {
  const [posts] = await db
    .select({
      total:     count(),
      published: sql<number>`count(*) filter (where ${schema.post.is_published})`.mapWith(Number),
    })
    .from(schema.post)

  const [pending] = await db
    .select({ total: count() })
    .from(schema.pendingRevalidation)

  const total     = posts?.total ?? 0
  const published = posts?.published ?? 0

  return {
    posts:      { total, published, drafts: total - published },
    pending:    pending?.total ?? 0,
    missing_en: await missingEn(),
  }
})
