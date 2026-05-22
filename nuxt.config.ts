export default defineNuxtConfig({
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
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s — whostolemysleep',
      link: [
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/cormorant-400-italic-latin.woff2' },
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/cormorant-400-normal-latin.woff2' },
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/martian-mono-300-normal-latin.woff2' },
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/martian-mono-400-normal-latin.woff2' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      script: [
        {
          innerHTML: `try{const t=localStorage.getItem('wms-theme');const p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='light'||(!t&&!p))document.documentElement.classList.add('light')}catch(e){}`,
          tagPriority: 'critical',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#07070a' },
        { name: 'color-scheme', content: 'dark' },
        {
          name: 'description',
          content: 'Frontend developer with 4+ years of experience. React, Vue, Next.js, Nuxt, TypeScript.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'whostolemysleep' },
      ],
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
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
  },
})
