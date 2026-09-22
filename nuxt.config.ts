export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2026-05-22',

  alias: { '~/server': './server' },

  devtools: { enabled: true },

  modules: ['@sentry/nuxt/module', '@pinia/nuxt', '@nuxtjs/i18n', '@vercel/speed-insights/nuxt', '@nuxt/eslint'],

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
    // Headers on everything that is served: the CSP allows exactly the origins the site
    // uses — its own domain, images from Vercel Blob and Vercel telemetry. Inline styles and
    // scripts are what Nuxt needs to hydrate, so they are allowed deliberately, not by oversight.
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
        // The admin password travels to the server in clear text inside TLS — as
        // everything does. HSTS forbids the browser from even trying http:// on this
        // domain, closing the window in which a request could leave unencrypted.
        // No preload: getting onto the browsers' list is easy, getting off it is slow.
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
    // The printable CV: kept out of search so it does not compete with /resume.
    '/ru/cv':        { isr: 7200, headers: { 'X-Robots-Tag': 'noindex' } },
    '/en/cv':        { isr: 7200, headers: { 'X-Robots-Tag': 'noindex' } },
    // The page is a form plus the contacts from settings — no reason to hit the
    // database for them on every request. The window is long on purpose:
    // settings.patch.ts queues both paths for revalidation, so an edit in the admin
    // panel propagates on the Flush button rather than when a timer runs out.
    '/ru/contacts':  { isr: 7200 },
    '/en/contacts':  { isr: 7200 },
    '/admin/**':     { ssr: true, headers: { 'X-Robots-Tag': 'noindex' } },
    '/ru/privacy':   { isr: 86400 },
    '/en/privacy':   { isr: 86400 },
  },

  css: ['~/assets/css/main.css'],

  app: {
    // The .page-* classes live in main.css, but without this setting Nuxt never
    // applied them — there were no page transitions at all.
    pageTransition: { name: 'page', mode: 'out-in' },

    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      titleTemplate: '%s — whostolemysleep',
      link: [
        // The base text font, needed in both locales. The display and Cyrillic faces
        // are loaded from layouts/default.vue per locale, so no visit pulls a file it
        // will not use.
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/jetbrains-mono-400-normal-latin.woff2' },
        // The SVG scales to any size; the PNGs are the fallback for browsers that do
        // not support an svg favicon.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      script: [
        {
          // useTheme sets wms-ext-dark once it spots Dark Reader or a similar extension
          // on the page: on the next load the site paints its own dark theme straight
          // away instead of flashing light until the extension kicks in.
          innerHTML: `try{const x=sessionStorage.getItem('wms-ext-dark')==='1';const t=localStorage.getItem('wms-theme');const p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(!x&&(t==='light'||(!t&&!p)))document.documentElement.classList.add('light')}catch(e){}`,
          tagPriority: 'critical',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#0a0a0c' },
        // The actual scheme comes from the color-scheme CSS property in main.css —
        // it switches together with the .light class on <html>.
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
      sentry: {
        dsn: process.env.NUXT_PUBLIC_SENTRY_DSN ?? '',
      },
    },
  },

  /**
   * Error reporting. Without it a 500 on the publisher endpoint is discovered by
   * noticing that a post never appeared — the site itself keeps serving cached
   * pages and says nothing.
   */
  sentry: {
    // Vercel runs the built server for us, so there is no start script to add
    // `--import` to. A top-level import is the supported way in: it covers HTTP
    // traces and every unhandled error, but not database-level spans.
    autoInjectServerSentry: 'top-level-import',

    // org, project and SENTRY_AUTH_TOKEN come from the environment: the token is
    // a write credential and has no business in a public repository. Without it
    // the build still succeeds, it just ships unreadable minified stack traces.
    sourcemaps: {
      // Maps are uploaded to Sentry and then removed from the bundle — otherwise
      // the whole source of the site is served to anyone who asks for the .map.
      filesToDeleteAfterUpload: ['./.nuxt/dist/client/**/*.map', './.output/**/*.map'],
    },
  },

  // 'hidden' keeps the sourceMappingURL comment out of the shipped JavaScript:
  // the maps exist for the upload step and for nothing else.
  sourcemap: { client: 'hidden' },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    experimental: {
      asyncContext: true,
      openAPI:      true,
    },

    openAPI: {
      meta: {
        title:       'whostolemysleep.ru API',
        description: 'Public site data, post intake from the external publisher, and the admin endpoints.',
        version:     '1.0.0',
      },
      production: false,
      ui: {
        scalar:  { route: '/_docs/scalar' },
        swagger: { route: '/_docs/swagger' },
      },
    },

    // The token ends up in .prerender-config.json next to every isr route. Requesting
    // a page with the same value in the x-prerender-revalidate header makes Vercel
    // rebuild that page's cache — the only way to drop the edge copy from inside the
    // application. Which means the same variable is needed both at build time and at
    // runtime, where server/utils/revalidate.ts reads it.
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
