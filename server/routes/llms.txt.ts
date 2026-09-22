import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post, settings, experience, skillGroup, skill } from '~~/server/db/schema'

/**
 * llms.txt — a short digest of the site for language models (llmstxt.org).
 * Markdown with a single H1, then sections of links.
 *
 * A route rather than a static public/llms.txt: projects and posts live in the
 * database and are edited through the admin panel, so a static file would drift
 * away from the site. Same reasoning as sitemap.xml.
 *
 * English, because that is the default locale and the convention of the format
 * itself. Links point at /en; the Russian mirror gets a section of its own.
 */

const BASE_URL = 'https://whostolemysleep.ru'

/** The stored excerpt is markdown; a description line needs plain text. */
function plain(text: string, limit = 155) {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links to their text
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (clean.length <= limit) return clean
  return `${clean.slice(0, limit).replace(/[\s,.;:—-]+$/, '')}…`
}

/** A project with its own url links out; everything else links to the blog page. */
function linkFor(p: { slug: string, url: string | null }) {
  return p.url || `${BASE_URL}/en/blog/${p.slug}`
}

function bullet(title: string, href: string, note: string) {
  return note ? `- [${title}](${href}): ${note}` : `- [${title}](${href})`
}

defineRouteMeta({
  openAPI: {
    tags:        ['Service'],
    summary:     'Site digest for language models',
    description: 'The llmstxt.org format: markdown with a single H1 and sections of links.',
    responses: {
      200: { description: 'Markdown', content: { 'text/plain': { schema: { type: 'string' } } } },
    },
  },
})

export default defineCachedEventHandler(async (event) => {
  const [posts, [config], firstJob, groups] = await Promise.all([
    db
      .select({
        slug:         post.slug,
        type:         post.type,
        title:        post.title_en,
        title_ru:     post.title_ru,
        excerpt:      post.excerpt_en,
        excerpt_ru:   post.excerpt_ru,
        url:          post.url,
        published_at: post.published_at,
      })
      .from(post)
      .where(eq(post.is_published, true)),
    db.select().from(settings).where(eq(settings.id, 1)),
    db.select({ date_from: experience.date_from })
      .from(experience).orderBy(asc(experience.date_from)).limit(1),
    db.select({ group: skillGroup.name_en, skill: skill.name })
      .from(skill)
      .innerJoin(skillGroup, eq(skill.group_id, skillGroup.id))
      .orderBy(asc(skillGroup.order), asc(skill.order)),
  ])

  // The same calculation as /api/settings — experience counts from the first job.
  const start = firstJob[0]?.date_from
  const years = start
    ? Math.floor((Date.now() - new Date(start).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 5

  const sorted = [...posts].sort((a, b) =>
    new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  )

  // title_en/excerpt_en are allowed to be empty — the Russian ones stand in.
  const entries = (type: 'blog' | 'project') => sorted
    .filter(p => p.type === type)
    .map(p => bullet(
      p.title || p.title_ru,
      linkFor(p),
      plain(p.excerpt || p.excerpt_ru || ''),
    ))

  const projects = entries('project')
  const articles = entries('blog')

  const skills = groups.reduce<Record<string, string[]>>((acc, row) => {
    (acc[row.group] ??= []).push(row.skill)
    return acc
  }, {})

  const contacts = [
    config?.email        && `- Email: ${config.email}`,
    config?.github_url   && `- GitHub: ${config.github_url}`,
    config?.telegram_url && `- Telegram: ${config.telegram_url}`,
    `- [Contact form](${BASE_URL}/en/contacts)`,
  ].filter(Boolean)

  const md = [
    '# whostolemysleep',
    '',
    `> Full-stack developer with ${years}+ years of experience. Production web apps in Nuxt `
      + 'and Vue, native desktop and mobile apps in Rust with Tauri. Previously built '
      + "high-load interfaces for two of Russia's largest banks. Open to remote work worldwide.",
    '',
    'Personal site and portfolio. Every page exists in two languages: English under `/en` '
      + 'and Russian under `/ru`. The content is identical, only the language differs — '
      + 'the links below point to the English version.',
    '',
    config?.open_to_work
      ? 'Currently open to new projects and long-term remote collaboration.'
      : 'Currently not looking for new projects.',
    '',
    '## Pages',
    '',
    bullet('Home', `${BASE_URL}/en`, 'intro, main stack, latest posts and projects'),
    bullet('Projects', `${BASE_URL}/en/projects`, 'portfolio of work'),
    bullet('Blog', `${BASE_URL}/en/blog`, 'articles on frontend development'),
    bullet('Resume', `${BASE_URL}/en/resume`, 'work experience, education, technical skills'),
    bullet('Contacts', `${BASE_URL}/en/contacts`, 'contact form and direct links'),
    '',
    '## Focus',
    '',
    '- **Nuxt / Vue** — architecture, SSR/ISR/SSG, Nitro, i18n; also React and Next.js',
    '- **Rust / Tauri** — cross-platform desktop and mobile, native plugins, system APIs',
    '- **TypeScript / Node** — REST and GraphQL APIs, tooling, published npm packages',
    '- **Performance** — Core Web Vitals as a budget; this site scores 100/100 on mobile',
    '',
    ...(Object.keys(skills).length
      ? [
          '## Skills',
          '',
          ...Object.entries(skills).map(([group, list]) => `- **${group}**: ${list.join(', ')}`),
          '',
        ]
      : []),
    ...(projects.length ? ['## Projects', '', ...projects, ''] : []),
    ...(articles.length ? ['## Blog posts', '', ...articles, ''] : []),
    '## Contact',
    '',
    ...contacts,
    '',
    '## Optional',
    '',
    bullet('Russian version', `${BASE_URL}/ru`, 'the same site in Russian'),
    bullet('Privacy Policy', `${BASE_URL}/en/privacy`, 'personal data processing, RF law 152-FZ'),
    '',
  ].join('\n')

  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  return md
}, {
  maxAge: 3600,
  getKey: () => 'llms-txt',
})
