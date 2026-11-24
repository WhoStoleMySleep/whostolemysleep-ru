import type { Locale, Post } from '../../app/types'

const COPY = {
  ru: {
    title: 'Личный сайт, который живёт вместе со мной',
    excerpt: 'Проекты, заметки и немного обо мне. А ещё — своя админка, две локализации и резюме, которое не нужно собирать заново перед каждой отправкой.',
    home: 'Главная: обо мне, проектах и последних заметках',
    projects: 'Проекты: работы и фильтр по технологиям',
    text: `<h2>Зачем мне ещё один сайт</h2>
<p>Хотелось собрать свои проекты и тексты в одном месте. Чтобы можно было и показать работу, и написать о том, что интересно, — без необходимости подгонять всё под резюме.</p>
<h2>Что я сделал</h2>
<p>Собрал публичную часть на Nuxt и отдельную админку для контента. Проекты, статьи, опыт и навыки хранятся в PostgreSQL: для изменения описания не нужно лезть в исходники.</p>
<p>Русская и английская версии используют одни и те же записи. Резюме и печатное CV тоже берут данные из общего источника — стаж рассчитывается по периодам работы, а не вписан в текст вручную.</p>
<h2>Как обновлять контент и не терять кеш</h2>
<p>Публичные страницы кешируются на Vercel. Это удобно для чтения, но после правки в админке посетитель не должен продолжать видеть старый текст.</p>
<p>Поэтому сохранение записи ставит связанные страницы в очередь обновления. Если обновить кеш сразу не получилось, запись в БД остаётся сохранённой, а страницы можно обновить повторно. Для каждой записи учитываются обе локализации.</p>
<h2>Что получилось</h2>
<p>Сайт работает на собственном домене. Есть блог, каталог проектов, поиск, резюме и печатное CV. Контент редактируется через админку, а ошибки приложения собираются в Sentry.</p>
<p>Следующий шаг — эти самые страницы проектов: хочется рассказывать не только о стеке, но и о том, зачем была нужна работа и какие решения за ней стоят.</p>`,
  },
  en: {
    title: 'A personal site that grows with me',
    excerpt: 'Projects, notes, and a bit about me. With a content editor, two languages, and a CV I don’t have to rebuild every time I need to send it.',
    home: 'Home: about me, selected work, and recent notes',
    projects: 'Projects: work filtered by technology',
    text: `<h2>Why build another website?</h2>
<p>I wanted a place for my projects and writing. Somewhere to show my work and talk about things I find interesting, without making everything fit a CV.</p>
<h2>What I built</h2>
<p>The public site runs on Nuxt, with a separate admin area for editing content. Projects, articles, experience, and skills live in PostgreSQL, so updating a description doesn’t require a code change.</p>
<p>The Russian and English versions share the same records. The resume and printable CV use a common data source too. Work experience is calculated from employment periods rather than typed into the page.</p>
<h2>Updating content without losing the cache</h2>
<p>Public pages are cached on Vercel. That works well for readers, but an edit in the admin area needs to reach those cached pages too.</p>
<p>Saving a record queues its related pages for refresh. If that refresh fails, the database change stays saved and the pages can be retried. Both languages are included.</p>
<h2>Where it is now</h2>
<p>The site is live on its own domain, with a blog, project catalogue, search, resume, and printable CV. Content is managed through the admin area, and application errors are collected in Sentry.</p>
<p>Project pages are the next step: a place to explain what a piece of work was for and the decisions behind it, rather than just list its stack.</p>`,
  },
}

/** Локальный черновик: API включает его только в dev с явным opt-in, без записи в БД. */
export function projectPreview(locale: Locale): Post {
  const copy = COPY[locale]
  return {
    id: 0, slug: 'preview-personal-site', type: 'project', title: copy.title,
    excerpt: copy.excerpt, text: copy.text, url: 'https://whostolemysleep.ru',
    is_pinned: false, published_at: null, updated_at: '',
    tags: ['Nuxt', 'Vue', 'TypeScript', 'PostgreSQL'].map((name, id) => ({ id, slug: name.toLowerCase(), name })),
    images: [
      { id: 0, url: '/project-preview/home.png', alt: copy.home, position: 0 },
      { id: 1, url: '/project-preview/projects.png', alt: copy.projects, position: 1 },
    ],
  }
}
