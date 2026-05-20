import type { Locale } from '~/types'

const translations = {
  ru: {
    nav: { blog: 'Блог', projects: 'Проекты', resume: 'Резюме', contacts: 'Контакты' },
    hero: {
      eyebrow: 'Frontend Разработка',
      line1: 'Основное занятие —',
      line2: 'создание сайтов',
      line3: 'с опытом более',
      years: 'лет',
      status: 'Открыт к предложениям',
    },
    about:    { eyebrow: 'Обо мне', resume: 'Посмотреть резюме', contact: 'Написать мне' },
    news:     { eyebrow: 'Последние записи', all: 'Все записи →' },
    blog: {
      eyebrow: 'Блог',
      title:   'Записи & Мысли',
      subtitle: 'Статьи о разработке, архитектуре, инструментах и опыте',
      filter:  'Фильтр по теме...',
      empty:   'Записей не найдено',
    },
    card:     { blog: 'Блог', project: 'Проект' },
    post:     { back: 'Назад к блогу', source: 'Открыть источник' },
    projects: {
      eyebrow: 'Проекты',
      title:   'Работы & Эксперименты',
      subtitle: 'Коммерческие проекты, пет-проекты и open-source',
      all: 'Все',
      empty: 'Проектов не найдено',
    },
    resume: {
      eyebrow: 'Резюме', title: 'Опыт & Навыки',
      about: 'Обо мне', experience: 'Опыт', education: 'Образование', skills: 'Навыки',
      present: 'н.в.',
    },
    contacts: {
      eyebrow: 'Контакты', title1: 'Давайте', title2: 'поговорим',
      subtitle: 'Открыт к новым проектам, вопросам и интересным предложениям',
      email: 'Почта', status: 'Статус', statusText: 'Открыт к предложениям',
      response: 'Время отклика', responseVal: '~24 часа',
      name: 'Имя', namePlaceholder: 'Иван Иванов',
      message: 'Сообщение', messagePlaceholder: 'Расскажите о вашем проекте...',
      submit: 'Отправить сообщение',
      success: 'Сообщение отправлено. Свяжусь с вами в ближайшее время.',
      required: 'Заполните все поля',
      sendError: 'Ошибка отправки. Попробуйте позже.',
    },
    search: {
      placeholder: 'Поиск по блогу и проектам...',
      empty: 'Ничего не найдено по запросу «{q}»',
      hint: 'Введите запрос — поиск по заголовкам, описаниям и тегам',
    },
    footer: { dev: 'Frontend-разработчик' },
    seo: {
      home_title:     'Frontend-разработчик',
      home_desc:      'Frontend-разработчик с опытом более 4 лет. React, Vue, Next.js, Nuxt, TypeScript.',
      blog_title:     'Блог',
      blog_desc:      'Статьи о фронтенд-разработке, технологиях и опыте работы.',
      projects_title: 'Проекты',
      projects_desc:  'Портфолио проектов — сайты, приложения, open-source.',
      resume_title:   'Резюме',
      resume_desc:    'Опыт работы, образование и технические навыки frontend-разработчика.',
      contacts_title: 'Контакты',
      contacts_desc:  'Связаться с фронтенд-разработчиком. Форма обратной связи.',
    },
  },
  en: {
    nav: { blog: 'Blog', projects: 'Projects', resume: 'Resume', contacts: 'Contacts' },
    hero: {
      eyebrow: 'Frontend Development',
      line1: 'Main focus —',
      line2: 'building websites',
      line3: 'with over',
      years: 'years',
      status: 'Open to opportunities',
    },
    about:    { eyebrow: 'About me', resume: 'View resume', contact: 'Contact me' },
    news:     { eyebrow: 'Latest posts', all: 'All posts →' },
    blog: {
      eyebrow: 'Blog',
      title:   'Posts & Thoughts',
      subtitle: 'Articles about development, architecture, tools and experience',
      filter:  'Filter by topic...',
      empty:   'No posts found',
    },
    card:     { blog: 'Blog', project: 'Project' },
    post:     { back: 'Back to blog', source: 'Open source' },
    projects: {
      eyebrow: 'Projects',
      title:   'Works & Experiments',
      subtitle: 'Commercial projects, pet projects and open-source',
      all: 'All',
      empty: 'No projects found',
    },
    resume: {
      eyebrow: 'Resume', title: 'Experience & Skills',
      about: 'About me', experience: 'Experience', education: 'Education', skills: 'Skills',
      present: 'present',
    },
    contacts: {
      eyebrow: 'Contacts', title1: "Let's", title2: 'talk',
      subtitle: 'Open to new projects, questions and interesting opportunities',
      email: 'Email', status: 'Status', statusText: 'Open to opportunities',
      response: 'Response time', responseVal: '~24 hours',
      name: 'Name', namePlaceholder: 'John Doe',
      message: 'Message', messagePlaceholder: 'Tell me about your project...',
      submit: 'Send message',
      success: 'Message sent. I will contact you shortly.',
      required: 'Please fill all fields',
      sendError: 'Send error. Please try again later.',
    },
    search: {
      placeholder: 'Search blog and projects...',
      empty: 'Nothing found for "{q}"',
      hint: 'Type to search by titles, descriptions and tags',
    },
    footer: { dev: 'Frontend Developer' },
    seo: {
      home_title:     'Frontend Developer',
      home_desc:      'Frontend developer with 4+ years of experience. React, Vue, Next.js, Nuxt, TypeScript.',
      blog_title:     'Blog',
      blog_desc:      'Articles about frontend development, technologies and work experience.',
      projects_title: 'Projects',
      projects_desc:  'Project portfolio — websites, applications, open-source.',
      resume_title:   'Resume',
      resume_desc:    'Work experience, education and technical skills of a frontend developer.',
      contacts_title: 'Contacts',
      contacts_desc:  'Contact a frontend developer. Feedback form.',
    },
  },
} as const

type DeepValue<T> = T extends string ? T : { [K in keyof T]: DeepValue<T[K]> }[keyof T]

export function useLocale() {
  const cookie = useCookie<Locale>('locale', {
    default: () => 'ru',
    maxAge:  365 * 24 * 3600,
  })
  const locale = useState<Locale>('locale', () => cookie.value)

  function setLocale(l: Locale) {
    locale.value = l
    cookie.value = l
  }

  function t(path: string): string {
    const keys = path.split('.')
    let node: any = translations[locale.value]
    for (const k of keys) {
      node = node?.[k]
      if (node === undefined) return path
    }
    return typeof node === 'string' ? node : path
  }

  function postCount(n: number): string {
    if (locale.value === 'en') return `${n} ${n === 1 ? 'post' : 'posts'}`
    const mod10  = n % 10
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 19) return `${n} записей`
    if (mod10 === 1)                   return `${n} запись`
    if (mod10 >= 2 && mod10 <= 4)      return `${n} записи`
    return `${n} записей`
  }

  return { locale, setLocale, t, postCount }
}
