import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'

const BASE_URL = 'https://whostolemysleep.ru'
const LOCALES  = ['en', 'ru']

const STATIC_PATHS = ['', '/blog', '/projects', '/resume', '/cv', '/contacts', '/privacy']

defineRouteMeta({
  openAPI: {
    tags:    ['Service'],
    summary: 'Sitemap',
    responses: {
      200: { description: 'A urlset with the static pages and the posts in both locales', content: { 'application/xml': { schema: { type: 'string' } } } },
    },
  },
})

export default defineEventHandler(async (event) => {
  const posts = await db
    .select({ slug: post.slug, type: post.type, url: post.url })
    .from(post)
    .where(eq(post.is_published, true))

  const staticUrls = STATIC_PATHS.flatMap(path =>
    LOCALES.map(locale => `${BASE_URL}/${locale}${path}`)
  )

  // The same rule /api/blog/[slug] serves by: everything that has a page here, which
  // is a blog post or a project with no site of its own. A project that links out has
  // no page to list.
  const postUrls = posts
    .filter(p => p.type === 'blog' || !p.url)
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
