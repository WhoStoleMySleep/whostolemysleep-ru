import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.POSTGRES_PRISMA_URL!)
const db = drizzle(sql, { schema })

const QUOTE_PREFIX = '> '
const HEADING_MARKER = '**'

function htmlBlock(block: string) {
  if (block.startsWith(QUOTE_PREFIX)) {
    const inner = block.slice(QUOTE_PREFIX.length).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return `<blockquote>${inner}</blockquote>`
  }
  if (block.startsWith(HEADING_MARKER) && block.endsWith(HEADING_MARKER)) {
    return `<h3>${block.slice(HEADING_MARKER.length, -HEADING_MARKER.length)}</h3>`
  }
  return `<p>${block.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`
}

function toHtml(raw: string): string {
  return raw.split(/ n /).map(block => block.trim()).filter(Boolean).map(htmlBlock).join('\n')
}

const ABOUT_TEXT = `<p>Frontend-разработчик. Основной стек — Vue / Nuxt / TypeScript.</p>`

const POST1_TEXT = `> "Самый опасный миф — это вера в то, что технология может сама по себе решить сложные человеческие проблемы." Клиффорд Столл n Понаблюдал за потоком постов про ИИ и поймал себя на мысли: мы все застряли в парадоксе. С одной стороны — восторг: «это сделает за пару секунд!». С другой — раздражение: «напиши в блок *такой-то, b-20, t-3*...» и мучительная правка результата. n Похоже, ИИ стал для многих цифровым дофамином: мгновенный ответ, иллюзия прогресса, микростресс от неидеального результата. И этот цикл повторяется. Но самая тревожная мысль не об эффективности, а о ловушке, в которую мы все можем попасть. n **Ловушка №1: Иллюзия эффективности** n Казалось бы, инструмент должен ускорять. Но исследования показывают парадокс: даже опытные разработчики при работе с ИИ-помощниками могут замедляться на 19%, при этом оставаясь уверенными, что он им помог. Представляете, что происходит с новичком? Обещанная «волшебная палочка» оборачивается болотом, из которого сложно выбраться, не имея базы для проверки. n **Ловушка №2: Капкан для новичков и «ловушка компетентности»** n Для начинающих специалистов ИИ — это двойная опасность. Сначала он создает «ловушку вложенных затрат»: ты уже потратил время, пытаясь объяснить задачу ИИ, и бросить жалко, хотя проще было бы сделать самому. А столкнувшись с неудачей, человек рискует навсегда застрять в «ловушке компетентности» — отказаться от технологии и вернуться к старым, менее эффективным методам, так и не научившись использовать ИИ по-настоящему. n **Ловушка №3: Социальный парадокс и утрата глубины** n Использование ИИ часто вызывает скрытое осуждение. Исследователи из Fuqua School of Business отмечают: коллег, применяющих ИИ, могут считать менее компетентными, даже если их работа объективно улучшается. Это убивает культуру экспериментов. А главное — легкий доступ к ответам рискует ослабить наши «мышцы» критического мышления, запоминания и глубокого анализа, особенно у тех, кто только формирует эти навыки. n **Так где же выход? Мой тезис.** n ИИ — это не работник и не оракул. Это увеличитель (force multiplier). Его сила раскрывается только в паре с человеческим суждением, экспертизой и ответственностью. Структура этой публикации и подбор исследований — наглядный пример такого симбиоза. Это не генерация контента "из вакуума", а усиление и организация собственных мыслей. Он не заменит нас, потому что не справится с тем, что требует настоящей эмпатии, творчества и этики. Но он может сделать нас сильнее, если мы научимся им управлять, а не подчиняться его «дофаминовым» циклам. n <p><strong>Вопрос к вам:</strong> Как вы используете ИИ в работе? Чувствуете ли этот парадокс — между ожиданием скорости и реальными трудностями?</p> n <p>То самое исследование: <a href="https://www.pnas.org/doi/suppl/10.1073/pnas.2426766122" target="_blank" rel="noopener noreferrer">pnas.org</a></p>`

const POST2_TEXT = `Как нередко случается, жизнь бывает полна неожиданных поворотов. И нередко именно в такие моменты нам приходится проявить свои навыки, преданность делу и усердие. Одним из таких моментов для меня стало мое первое живое собеседование на интересную работу. n Моё увлечение разработкой сайтов заставило меня полностью погрузиться в создание сайта в течение всего лета. Я работал день и ночь, с упоением творил и воплощал свои идеи на экране. Когда пришло время презентовать сайт — мой будущий руководитель был поражён моим усердием и результатами. n И вот настал день собеседования. Несмотря на отсутствие сна, моё усердие и преданность делу нашли положительное отражение в ходе интервью, и меня приняли на работу. n Теперь, когда я вижу результат своих усилий в виде того, что моя работа приносит пользу и радость другим, я понимаю, что каждый момент, потраченный на воплощение своих идей, стоил того. Для меня это стало не просто работой, но и увлекательным творческим процессом. n Моя история — пример того, как усердие, преданность и страсть могут привести к новым увлекательным возможностям и радостному развитию. Я убеждён, что важно следовать своим мечтам и продолжать двигаться вперёд, несмотря на любые трудности, которые могут возникнуть на пути к успеху.`

const SKILLS = [
  {
    slug: 'languages',
    name_ru: 'Языки',
    name_en: 'Languages',
    order: 0,
    skills: ['JavaScript', 'TypeScript', 'HTML', 'CSS'],
  },
  {
    slug: 'frameworks',
    name_ru: 'Фреймворки',
    name_en: 'Frameworks',
    order: 1,
    skills: ['Vue', 'Nuxt', 'React', 'Tauri'],
  },
  {
    slug: 'deploy',
    name_ru: 'Деплой',
    name_en: 'Deploy',
    order: 2,
    skills: ['Vercel', 'CI/CD'],
  },
  {
    slug: 'instruments',
    name_ru: 'Инструменты',
    name_en: 'Tools',
    order: 3,
    skills: ['Git', 'Vite', 'Vitest', 'REST API', 'PostgreSQL', 'Drizzle ORM', 'Sentry'],
  },
]

const POSTS: (typeof schema.post.$inferInsert)[] = [
  {
    slug:         'ai-i-my',
    type:         'blog',
    title_ru:     'ИИ и мы: стоим ли мы над пропастью эффективности',
    excerpt_ru:   'Размышления о парадоксах использования ИИ в разработке, ловушках для новичков и том, как превратить инструмент из цифрового дофамина в настоящий усилитель возможностей.',
    text_ru:      toHtml(POST1_TEXT),
    is_published: true,
    published_at: '2026-01-27 07:46:53',
  },
  {
    slug:         'pervaya-rabota',
    type:         'blog',
    title_ru:     'Первая реальная работа',
    excerpt_ru:   'Первое собеседование вживую, первые трудности и новая интересная работа.',
    text_ru:      toHtml(POST2_TEXT),
    is_published: true,
    published_at: '2026-01-27 07:42:58',
  },
]

const IMAGES = [
  {
    url:      'https://umihgl7z2ekcut1l.public.blob.vercel-storage.com/photo-1542831371-29b0f74f9713%20(1)-QDBLCPz51bfQKTs8g30aXpzJgAmnXS.webp',
    alt_ru:   '',
    position: 0,
  },
  {
    url:      'https://umihgl7z2ekcut1l.public.blob.vercel-storage.com/Modern-Office-Interior-with-Open-Floor-Plan-scaled%20(1)-gnrRp7QHvUtJBtNjnAbix0H2TlqEVm.webp',
    alt_ru:   '',
    position: 0,
  },
]

type SeedPost = typeof schema.post.$inferSelect
type SeedTag = typeof schema.tag.$inferSelect

async function seedTags() {
  const tags = await db.insert(schema.tag).values([
    { slug: 'personal', name_ru: 'Личное', name_en: 'Personal' },
    { slug: 'work',     name_ru: 'Работа', name_en: 'Work' },
  ]).returning()
  console.log('✓ tags')
  return tags
}

async function seedPosts() {
  const posts = await db.insert(schema.post).values(POSTS).returning()
  console.log('✓ posts')
  return posts
}

async function seedPostTags(posts: SeedPost[], tags: SeedTag[]) {
  const [post1, post2] = posts
  const [personal] = tags
  await db.insert(schema.postTag).values([
    { post_id: post1!.id, tag_id: personal!.id },
    { post_id: post2!.id, tag_id: personal!.id },
  ])
  console.log('✓ post_tags')
}

async function seedImages(posts: SeedPost[]) {
  await db.insert(schema.image).values(IMAGES.map((image, index) => ({
    post_id: posts[index]!.id, ...image,
  })))
  console.log('✓ images')
}

async function seedEducation() {
  await db.insert(schema.education).values({
    institution:       'Национальный исследовательский Томский политехнический университет',
    specialization_ru: 'Неоконченное высшее',
    specialization_en: 'Incomplete higher education',
    date_from:         '2021-09-01',
    date_to:           null,
    order:             0,
  })
  console.log('✓ education')
}

async function seedSkills() {
  for (const group of SKILLS) {
    const [inserted] = await db.insert(schema.skillGroup).values({
      slug: group.slug, name_ru: group.name_ru, name_en: group.name_en, order: group.order,
    }).returning()
    await db.insert(schema.skill).values(
      group.skills.map((name, order) => ({ group_id: inserted!.id, name, order }))
    )
  }
  console.log('✓ skill_groups + skills')
}

async function seed() {
  console.log('Seeding...')
  await db.insert(schema.aboutMe).values({ text_ru: ABOUT_TEXT })
  console.log('✓ about_me')
  const tags = await seedTags()
  const posts = await seedPosts()
  await seedPostTags(posts, tags)
  await seedImages(posts)
  await seedEducation()
  await seedSkills()
  console.log('Done.')
}

seed().catch((error) => { console.error(error); process.exit(1) })
