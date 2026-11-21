import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'
import { SITE_URL as BASE_URL } from '~~/shared/utils/site'

const LOCALES  = ['en', 'ru']

// /cv is missing on purpose: routeRules serves it with X-Robots-Tag: noindex, so
// listing it here would ask a crawler to index what the same site tells it to skip.
const STATIC_PATHS = ['', '/blog', '/projects', '/resume', '/contacts', '/privacy']

interface Entry { loc: string; lastmod?: string }
type SitemapPost = Pick<typeof post.$inferSelect, 'slug' | 'type' | 'url' | 'updated_at'>

defineRouteMeta({
  openAPI: {
    tags:    ['Service'],
    summary: 'Sitemap',
    responses: {
      200: { description: 'A urlset with the static pages and the posts in both locales', content: { 'application/xml': { schema: { type: 'string' } } } },
    },
  },
})

function postEntries(row: SitemapPost): Entry[] {
  return LOCALES.map(locale => ({
    loc: `${BASE_URL}/${locale}/blog/${row.slug}`,
    lastmod: row.updated_at?.slice(0, 10),
  }))
}

function sitemapXml(entries: Entry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ loc, lastmod }) => lastmod
      ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
      : `  <url><loc>${loc}</loc></url>`),
    '</urlset>',
  ].join('\n')
}

export default defineCachedEventHandler(async (event) => {
  const posts = await db
    .select({ slug: post.slug, type: post.type, url: post.url, updated_at: post.updated_at })
    .from(post).where(eq(post.is_published, true))
  const staticUrls: Entry[] = STATIC_PATHS.flatMap(path =>
    LOCALES.map(locale => ({ loc: `${BASE_URL}/${locale}${path}` }))
  )
  // External projects have no local page. Static pages omit lastmod because their
  // markup's modification time is not known here.
  const postUrls = posts.filter(row => row.type === 'blog' || !row.url).flatMap(postEntries)
  const xml = sitemapXml([...staticUrls, ...postUrls])
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return xml
}, {
  // Crawlers ask for it far more often than posts appear; the same window as llms.txt.
  maxAge: 3600,
  getKey: () => 'sitemap-xml',
})
