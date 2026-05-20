export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  routeRules: {
    '/': { isr: 3600 },
    '/blog': { isr: 600 },
    '/blog/**': { isr: 600 },
    '/projects': { isr: 600 },
    '/resume': { isr: 7200 },
    '/contacts': { ssr: true },
    '/sitemap.xml': { prerender: true },
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'ru' },
      titleTemplate: '%s — whostolemysleep',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Martian+Mono:wght@300;400;500;600&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'theme-color', content: '#07070a' },
        { name: 'color-scheme', content: 'dark' },
        {
          name: 'description',
          content: 'Frontend-разработчик с опытом более 4 лет. Специализация: React, Vue, Next.js, Nuxt, TypeScript.',
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'ru_RU' },
        { property: 'og:site_name', content: 'whostolemysleep' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
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
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
})
