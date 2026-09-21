export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2026-05-22',

  alias: { '~/server': './server' },

  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vercel/speed-insights/nuxt', '@nuxt/eslint'],

  eslint: {
    config: {
      stylistic: false,
    },
  },

  i18n: {
    baseUrl: 'https://whostolemysleep.ru',
    strategy: 'prefix',
    defaultLocale: 'en',
    langDir: 'locales/',
    locales: [
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: false,
  },

  routeRules: {
    // Заголовки на всё, что отдаётся: CSP оставляет ровно те источники, которыми сайт пользуется —
    // свой домен, картинки из Vercel Blob и телеметрия Vercel. Inline-стили и скрипты нужны Nuxt
    // для гидрации, поэтому они разрешены явно, а не по недосмотру.
    '/**': {
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
          "font-src 'self' data:",
          "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
          'upgrade-insecure-requests',
        ].join('; '),
        // Пароль админки уходит на сервер открытым текстом внутри TLS — как и
        // везде. HSTS запрещает браузеру вообще пробовать http:// на домене,
        // то есть закрывает окно, в котором запрос мог уйти без шифрования.
        // Без preload: попасть в список браузеров легко, выйти — долго.
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy':        'strict-origin-when-cross-origin',
        'X-Frame-Options':        'DENY',
        'Permissions-Policy':     'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    },
    '/':             { ssr: true },
    '/ru':           { isr: 3600 },
    '/en':           { isr: 3600 },
    '/ru/blog':      { isr: 600 },
    '/en/blog':      { isr: 600 },
    '/ru/blog/**':   { isr: 600 },
    '/en/blog/**':   { isr: 600 },
    '/ru/projects':  { isr: 600 },
    '/en/projects':  { isr: 600 },
    '/ru/resume':    { isr: 7200 },
    '/en/resume':    { isr: 7200 },
    // Печатная версия резюме: из поиска исключена, чтобы не конкурировать с /resume.
    '/ru/cv':        { isr: 7200, headers: { 'X-Robots-Tag': 'noindex' } },
    '/en/cv':        { isr: 7200, headers: { 'X-Robots-Tag': 'noindex' } },
    // Страница состоит из формы и контактов из настроек — на каждый запрос
    // ходить в базу за ними незачем. Окно длинное: settings.patch.ts кладёт
    // оба пути в очередь ревалидации, так что правка в админке разъезжается
    // по кнопке Flush, а не по истечении таймера.
    '/ru/contacts':  { isr: 7200 },
    '/en/contacts':  { isr: 7200 },
    '/admin/**':     { ssr: true, headers: { 'X-Robots-Tag': 'noindex' } },
    '/ru/privacy':   { isr: 86400 },
    '/en/privacy':   { isr: 86400 },
  },

  css: ['~/assets/css/main.css'],

  app: {
    // Классы .page-* лежат в main.css, но без этой настройки Nuxt их
    // не применял — переходов между страницами не было вовсе.
    pageTransition: { name: 'page', mode: 'out-in' },

    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s — whostolemysleep',
      link: [
        // Базовый шрифт текста, нужен в обеих локалях. Дисплейный и
        // кириллический подгружаются из layouts/default.vue по локали,
        // чтобы не тянуть лишний файл на каждый визит.
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/jetbrains-mono-400-normal-latin.woff2' },
        // SVG тянется под любой размер, PNG — запасной вариант для
        // браузеров без поддержки svg-фавикона.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      script: [
        {
          // wms-ext-dark ставит useTheme, когда на странице замечен Dark Reader
          // или похожее расширение: при следующей загрузке сайт сразу рисует
          // свою тёмную тему, а не мигает светлой до появления расширения.
          innerHTML: `try{const x=sessionStorage.getItem('wms-ext-dark')==='1';const t=localStorage.getItem('wms-theme');const p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(!x&&(t==='light'||(!t&&!p)))document.documentElement.classList.add('light')}catch(e){}`,
          tagPriority: 'critical',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#0a0a0c' },
        // Конкретную схему задаёт CSS-свойство color-scheme в main.css —
        // оно переключается вместе с классом .light на <html>.
        { name: 'color-scheme', content: 'dark light' },
        {
          name: 'description',
          content: 'Full-stack developer. Nuxt, Vue and TypeScript on the web, Rust and Tauri for native desktop and mobile apps. Open to remote work worldwide.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'whostolemysleep' },
        { property: 'og:image', content: 'https://whostolemysleep.ru/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://whostolemysleep.ru/og-image.png' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      contactForm: process.env.NUXT_PUBLIC_CONTACT_FORM !== 'false',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    experimental: {
      asyncContext: true,
    },

    // Токен попадает в .prerender-config.json рядом с каждым isr-маршрутом.
    // Запрос страницы с таким же значением в заголовке x-prerender-revalidate
    // заставляет Vercel перестроить её кеш — единственный способ сбросить
    // эдж из приложения. Значит, одна и та же переменная нужна и на сборке,
    // и в рантайме, где её читает server/utils/revalidate.ts.
    vercel: {
      config: {
        bypassToken: process.env.ISR_BYPASS_TOKEN,
      },
    },
  },

  vite: {
    optimizeDeps: {
      include: ['fuse.js'],
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
  },
})
