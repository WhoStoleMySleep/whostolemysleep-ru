import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    // Окружение Nuxt: спекам доступны автоимпорты (ref, computed, useState)
    // и алиасы ~ / ~~ — те же, что в приложении. Без него пришлось бы
    // импортировать вручную и расходиться с тем, как код работает на самом деле.
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        overrides: {
          // Манифест тянется по сети из собранного приложения — тестам не нужен.
          experimental: { appManifest: false },
        },
      },
    },
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/composables/**', 'server/utils/**'],
    },
    // Модули аналитики в тестовом окружении честно пытаются загрузить скрипт
    // с vercel-scripts.com и пишут об этом в вывод. К тестам это отношения
    // не имеет, остальной вывод виден как обычно.
    onConsoleLog: (log) => !log.includes('va.vercel-scripts.com'),

    // Первый запуск поднимает Nuxt целиком — дефолтных 10 секунд не хватает.
    hookTimeout: 60000,
  },
})
