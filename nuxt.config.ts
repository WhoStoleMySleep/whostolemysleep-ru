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
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      htmlAttrs: { lang: 'ru' },
      titleTemplate: '%s — whostolemysleep',
      link: [
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/cormorant-300-normal-cyrillic.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/cormorant-300-normal-latin.woff2', crossorigin: '' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/martian-mono-300-normal-latin.woff2', crossorigin: '' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      script: [
        {
          children: `try{const t=localStorage.getItem('wms-theme');const p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='light'||(!t&&!p))document.documentElement.classList.add('light')}catch(e){}`,
          tagPriority: 'critical',
        },
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
