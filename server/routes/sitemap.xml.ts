import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'

const BASE_URL = 'https://whostolemysleep.ru'
const LOCALES  = ['en', 'ru']

// /cv is missing on purpose: routeRules serves it with X-Robots-Tag: noindex, so
// listing it here would ask a crawler to index what the same site tells it to skip.
const STATIC_PATHS = ['', '/blog', '/projects', '/resume', '/contacts', '/privacy']

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
    .select({ slug: post.slug, type: post.type, url: post.url, updated_at: post.updated_at })
    .from(post)
    .where(eq(post.is_published, true))

  interface Entry { loc: string, lastmod?: string }

  const staticUrls: Entry[] = STATIC_PATHS.flatMap(path =>
    LOCALES.map(locale => ({ loc: `${BASE_URL}/${locale}${path}` }))
  )

  // The same rule /api/blog/[slug] serves by: everything that has a page here, which
  // is a blog post or a project with no site of its own. A project that links out has
  // no page to list.
  //
  // lastmod is only on these: a static page changes when its markup does, and this
  // handler has no way of knowing when that was. Dating them with today would be a
  // lie a crawler learns to ignore.
  const postUrls: Entry[] = posts
    .filter(p => p.type === 'blog' || !p.url)
    .flatMap(p => LOCALES.map(locale => ({
      loc:     `${BASE_URL}/${locale}/blog/${p.slug}`,
      lastmod: p.updated_at?.slice(0, 10),
    })))

  const allUrls = [...staticUrls, ...postUrls]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allUrls.map(({ loc, lastmod }) => lastmod
      ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
      : `  <url><loc>${loc}</loc></url>`),
    '</urlset>',
  ].join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
})
