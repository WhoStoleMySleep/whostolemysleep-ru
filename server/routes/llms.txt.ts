import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post, settings, experience, skillGroup, skill } from '~~/server/db/schema'
import { plainText } from '~~/server/utils/text'
import { SITE_URL as BASE_URL } from '~~/shared/utils/site'
import { experienceYears } from '~~/shared/utils/experience'

/**
 * A dynamic llmstxt.org digest follows admin edits, like sitemap.xml. English is
 * the format's convention; the Russian mirror is linked separately.
 */

const POST_COLUMNS = {
  slug:         post.slug,
  type:         post.type,
  title:        post.title_en,
  title_ru:     post.title_ru,
  excerpt:      post.excerpt_en,
  excerpt_ru:   post.excerpt_ru,
  url:          post.url,
  published_at: post.published_at,
}

const PAGE_LINKS = [
  '## Pages',
  '',
  bullet('Home', `${BASE_URL}/en`, 'intro, main stack, latest posts and projects'),
  bullet('Projects', `${BASE_URL}/en/projects`, 'portfolio of work'),
  bullet('Blog', `${BASE_URL}/en/blog`, 'articles on frontend development'),
  bullet('Resume', `${BASE_URL}/en/resume`, 'work experience, education, technical skills'),
  bullet('Contacts', `${BASE_URL}/en/contacts`, 'contact form and direct links'),
  '',
]

const FOCUS_LINES = [
  '## Focus',
  '',
  '- **Vue / Nuxt** — interface development, SSR/ISR/SSG, i18n, Nuxt 2 to Nuxt 3 and 4 migrations',
  '- **React (supporting)** — personal projects, including Wave and Freel',
  '- **Rust / Tauri (supporting)** — desktop and Android apps, Tauri plugins, system API integration',
  '- **TypeScript / APIs** — frontend integration with REST APIs; additional experience in Nitro server logic and published npm packages',
  '',
]

const OPTIONAL_LINKS = [
  '## Optional',
  '',
  bullet('Russian version', `${BASE_URL}/ru`, 'the same site in Russian'),
  bullet('Privacy Policy', `${BASE_URL}/en/privacy`, 'personal data processing, RF law 152-FZ'),
  '',
]

type DigestPost = Awaited<ReturnType<typeof loadDigestData>>['posts'][number]
type DigestSettings = typeof settings.$inferSelect | undefined

/** A project with its own url links out; everything else links to the blog page. */
function linkFor(row: { slug: string; url: string | null }) {
  return row.url || `${BASE_URL}/en/blog/${row.slug}`
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

async function loadDigestData() {
  const [posts, [config], periods, groups] = await Promise.all([
    db.select(POST_COLUMNS).from(post).where(eq(post.is_published, true)),
    db.select().from(settings).where(eq(settings.id, 1)),
    db.select({ date_from: experience.date_from, date_to: experience.date_to }).from(experience),
    db.select({ group: skillGroup.name_en, skill: skill.name }).from(skill)
      .innerJoin(skillGroup, eq(skill.group_id, skillGroup.id))
      .orderBy(asc(skillGroup.order), asc(skill.order)),
  ])
  return { posts, config, periods, groups }
}

function introduction(years: number, config: DigestSettings) {
  return [
    '# whostolemysleep',
    '',
    `> Frontend developer with ${years}+ years of experience. My primary stack is Vue, Nuxt and TypeScript. `
      + 'I build interfaces for online stores and services and migrate projects to newer Nuxt versions. '
      + 'Additional experience includes React, server-side development and Rust / Tauri apps.',
    '',
    'Personal site and portfolio. Every page exists in two languages: English under `/en` '
      + 'and Russian under `/ru`. The content is identical, only the language differs — '
      + 'the links below point to the English version.',
    '',
    config?.open_to_work
      ? 'Currently open to new projects and long-term remote collaboration.'
      : 'Currently not looking for new projects.',
    '',
  ]
}

function section(title: string, lines: string[]) {
  return lines.length ? [`## ${title}`, '', ...lines, ''] : []
}

function postSections(posts: DigestPost[]) {
  const sorted = [...posts].sort((a, b) =>
    new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  )
  const projects: string[] = []
  const articles: string[] = []
  for (const row of sorted) {
    // English fields may be empty; Russian fields are the site's fallback.
    const line = bullet(row.title || row.title_ru, linkFor(row), plainText(row.excerpt || row.excerpt_ru || ''))
    if (row.type === 'project') projects.push(line)
    if (row.type === 'blog') articles.push(line)
  }
  return [...section('Projects', projects), ...section('Blog posts', articles)]
}

function skillSection(groups: { group: string; skill: string }[]) {
  const skills: Record<string, string[]> = {}
  for (const row of groups) {
    (skills[row.group] ??= []).push(row.skill)
  }
  const lines = Object.entries(skills).map(([group, list]) => `- **${group}**: ${list.join(', ')}`)
  return section('Skills', lines)
}

function contactSection(config: DigestSettings) {
  return [
    '## Contact',
    '',
    ...[
      config?.email        && `- Email: ${config.email}`,
      config?.github_url   && `- GitHub: ${config.github_url}`,
      config?.telegram_url && `- Telegram: ${config.telegram_url}`,
      `- [Contact form](${BASE_URL}/en/contacts)`,
    ].filter(Boolean),
    '',
  ]
}

function digestMarkdown({ posts, config, periods, groups }: Awaited<ReturnType<typeof loadDigestData>>) {
  return [
    ...introduction(experienceYears(periods), config),
    ...PAGE_LINKS,
    ...FOCUS_LINES,
    ...skillSection(groups),
    ...postSections(posts),
    ...contactSection(config),
    ...OPTIONAL_LINKS,
  ].join('\n')
}

export default defineCachedEventHandler(async (event) => {
  const markdown = digestMarkdown(await loadDigestData())
  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  return markdown
}, {
  maxAge: 3600,
  getKey: () => 'llms-txt',
})
