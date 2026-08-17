import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { post, settings, experience, skillGroup, skill } from '~~/server/db/schema'

/**
 * llms.txt — краткая выжимка сайта для языковых моделей (llmstxt.org).
 * Markdown с одним H1, дальше секции со ссылками.
 *
 * Роут, а не статический public/llms.txt: проекты и статьи живут в базе
 * и правятся через админку — статический файл разошёлся бы с сайтом.
 * Логика та же, что у sitemap.xml.
 *
 * Язык — английский: это локаль по умолчанию и соглашение самого формата.
 * Ссылки ведут на /en, русское зеркало упомянуто отдельной секцией.
 */

const BASE_URL = 'https://whostolemysleep.ru'

/** Excerpt в базе — markdown; для строки-описания нужен голый текст. */
function plain(text: string, limit = 155) {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // картинки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // ссылки → текст
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (clean.length <= limit) return clean
  return `${clean.slice(0, limit).replace(/[\s,.;:—-]+$/, '')}…`
}

/** Проекты со своим url ведут наружу, остальное — на страницу блога. */
function linkFor(p: { slug: string, url: string | null }) {
  return p.url || `${BASE_URL}/en/blog/${p.slug}`
}

function bullet(title: string, href: string, note: string) {
  return note ? `- [${title}](${href}): ${note}` : `- [${title}](${href})`
}

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

  // Тот же расчёт, что в /api/settings — стаж считается от первой работы.
  const start = firstJob[0]?.date_from
  const years = start
    ? Math.floor((Date.now() - new Date(start).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 4

  const sorted = [...posts].sort((a, b) =>
    new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  )

  // title_en/excerpt_en в схеме могут быть пустыми — тогда берём русские.
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
    `> Frontend developer with ${years}+ years of experience building high-load interfaces `
      + 'for fintech. Vue, Nuxt, React, Next.js, TypeScript.',
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
    '- **Next.js / Nuxt.js** — architecture, SSR/ISR/SSG, optimization',
    '- **React / Vue** — TypeScript, Zustand/Pinia, TanStack Query',
    '- **Performance** — Core Web Vitals, working with large datasets',
    '- **UI** — Tailwind CSS, Shadcn/ui, design systems',
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
