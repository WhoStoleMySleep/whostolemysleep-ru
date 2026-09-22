import { desc, eq, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post } from '~~/server/db/schema'
import { pick } from '~~/server/utils/locale'
import { plainText, escapeXml } from '~~/server/utils/text'

const BASE_URL = 'https://whostolemysleep.ru'

/** Enough for a reader to catch up on; the rest is on the site. */
const ITEMS = 20

/**
 * Feed metadata, one entry per locale. The site's own titles live in
 * `i18n/locales/*.json`, but those are the strings a page header shows — a feed
 * names the publication, not the page, so the two are deliberately separate.
 */
const CHANNEL = {
  en: {
    title:       'whostolemysleep — Blog',
    description: 'Articles about frontend development, Nuxt, Rust and the work behind them.',
    language:    'en-US',
  },
  ru: {
    title:       'whostolemysleep — Блог',
    description: 'Статьи о фронтенде, Nuxt, Rust и работе, которая за ними стоит.',
    language:    'ru-RU',
  },
} as const

export type FeedLocale = keyof typeof CHANNEL

export function isFeedLocale(value: unknown): value is FeedLocale {
  return value === 'en' || value === 'ru'
}

/** RFC 822, which is what RSS dates are, unlike the ISO strings everywhere else. */
function rfc822(value: string | null): string {
  return new Date(value ?? Date.now()).toUTCString()
}

/**
 * The blog as RSS 2.0.
 *
 * Only posts of type `blog`: a feed is a reading queue, and a project entry is a
 * thing to look at, not an article to read. Each item carries both the excerpt as
 * `description` and the full stored html in `content:encoded`, so a reader can show
 * the whole post without a round trip to the site.
 */
export async function buildFeed(locale: FeedLocale): Promise<string> {
  const rows = await db
    .select({
      slug:         post.slug,
      title_ru:     post.title_ru,
      title_en:     post.title_en,
      text_ru:      post.text_ru,
      text_en:      post.text_en,
      excerpt_ru:   post.excerpt_ru,
      excerpt_en:   post.excerpt_en,
      published_at: post.published_at,
      updated_at:   post.updated_at,
    })
    .from(post)
    .where(and(eq(post.is_published, true), eq(post.type, 'blog')))
    .orderBy(desc(post.published_at))
    .limit(ITEMS)

  const channel = CHANNEL[locale]
  const self    = `${BASE_URL}/${locale}/rss.xml`

  const items = rows.map((row) => {
    const link  = `${BASE_URL}/${locale}/blog/${row.slug}`
    const title = pick(row.title_ru, row.title_en, locale)
    const body  = pick(row.text_ru, row.text_en, locale)

    return [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <pubDate>${rfc822(row.published_at)}</pubDate>`,
      `      <description>${escapeXml(plainText(pick(row.excerpt_ru, row.excerpt_en, locale), 300))}</description>`,
      `      <content:encoded><![CDATA[${body.replace(/]]>/g, ']]&gt;')}]]></content:encoded>`,
      '    </item>',
    ].join('\n')
  })

  // The newest post, not the moment of the request: a reader polling an unchanged
  // feed should see an unchanged date.
  const lastBuild = rfc822(rows[0]?.updated_at ?? rows[0]?.published_at ?? null)

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${BASE_URL}/${locale}/blog</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${channel.language}</language>`,
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <atom:link href="${self}" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
  ].join('\n')
}
