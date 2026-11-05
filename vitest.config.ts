import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        overrides: {
          experimental: { appManifest: false },
        },
      },
    },
    include: ['tests/**/*.spec.ts'],
    // The cached Nuxt entry keeps its imports relative to where it was first built,
    // and on the next run they no longer resolve: every suite fails to load. CI
    // never noticed because it always starts with an empty cache.
    fsModuleCache: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'app/composables/**',
        'app/middleware/**',
        'app/stores/**',
        'server/utils/**',
        'server/middleware/**',
      ],
      // Just below the current numbers: a floor against erosion, not a target.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 85,
        lines: 90,
      },
    },
    onConsoleLog: (log) => !log.includes('va.vercel-scripts.com'),

    hookTimeout: 60000,
  },
})
