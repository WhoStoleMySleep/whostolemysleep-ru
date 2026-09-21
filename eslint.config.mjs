import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      '.vercel/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'drizzle/**',
    ],
  },

  {
    files: ['**/*.ts', '**/*.vue', '**/*.mjs'],
    rules: {
      // console.log в отданном коде — почти всегда забытая отладка. Сервер
      // про настоящие сбои пишет через console.error, поэтому он разрешён.
      'no-console':  ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',

      // Автоимпорты Nuxt включены, и ручной импорт того же самого —
      // лишняя строка, которая ещё и расходится при переименовании.
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['~/composables/**'], message: 'Composables автоимпортируются.' },
          { group: ['~/components/**', '#components/**'], message: 'Компоненты автоимпортируются.' },
          { group: ['#imports', 'nuxt/app'], message: 'Автоимпортируется Nuxt.' },
          { group: ['pinia'], message: 'Pinia автоимпортируется через модуль.' },
          {
            group: ['vue'],
            importNames: [
              'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'nextTick',
              'onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount',
            ],
            message: 'Composition API автоимпортируется.',
          },
        ],
      }],

      // Косметика шаблона отключена по той же причине, что и форматирование:
      // порядок атрибутов и переносы в этом проекте расставлены осмысленно.
      'vue/attributes-order':          'off',
      'vue/html-self-closing':         'off',
      'vue/first-attribute-linebreak': 'off',
      // Пропсы описаны типами TS: необязательный проп и так undefined,
      // выдумывать ему значение по умолчанию незачем.
      'vue/require-default-prop': 'off',
      // v-html в проекте получает только то, что прошло sanitizeHtml
      // (server/utils/sanitize.ts) — на нём и держится защита, а не на правиле.
      'vue/no-v-html': 'off',
    },
  },

  {
    // Консольные скрипты и сидер общаются с запустившим их человеком
    // через stdout — там console.log и есть интерфейс.
    files: ['scripts/**', 'server/db/seed.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    // Серверная часть живёт вне Nuxt-приложения: там свои автоимпорты Nitro,
    // а `~/composables` и Vue-хуки к ней отношения не имеют.
    files: ['server/**/*.ts', 'scripts/**/*.mjs'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-restricted-imports': 'off',
    },
  },
)
