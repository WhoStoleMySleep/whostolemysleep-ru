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
      'no-console':  ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',

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

      'vue/attributes-order':          'off',
      'vue/html-self-closing':         'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-v-html': 'off',
    },
  },

  {
    files: ['scripts/**', 'server/db/seed.ts'],
    rules: { 'no-console': 'off' },
  },

  {
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
