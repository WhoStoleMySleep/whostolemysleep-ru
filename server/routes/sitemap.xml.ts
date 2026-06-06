import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'

const BASE_URL = 'https://whostolemysleep.ru'
const LOCALES  = ['en', 'ru']

const STATIC_PATHS = ['', '/blog', '/projects', '/resume', '/contacts', '/privacy']

export default defineEventHandler(async (event) => {
  const posts = await db
    .select({ slug: post.slug, type: post.type })
    .from(post)
    .where(eq(post.is_published, true))

  const staticUrls = STATIC_PATHS.flatMap(path =>
    LOCALES.map(locale => `${BASE_URL}/${locale}${path}`)
  )

  const postUrls = posts
    .filter(p => p.type === 'blog')
    .flatMap(p => LOCALES.map(locale => `${BASE_URL}/${locale}/blog/${p.slug}`))

  const allUrls = [...staticUrls, ...postUrls]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allUrls.map(url => `  <url><loc>${url}</loc></url>`),
    '</urlset>',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
