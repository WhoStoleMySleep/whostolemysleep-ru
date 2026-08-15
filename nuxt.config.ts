export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2026-05-22',

  alias: { '~/server': './server' },

  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxtjs/i18n'],

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
    '/ru/contacts':  { ssr: true },
    '/en/contacts':  { ssr: true },
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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      script: [
        {
          innerHTML: `try{const t=localStorage.getItem('wms-theme');const p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='light'||(!t&&!p))document.documentElement.classList.add('light')}catch(e){}`,
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
          content: 'Frontend developer with 4+ years of experience. React, Vue, Next.js, Nuxt, TypeScript.',
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
