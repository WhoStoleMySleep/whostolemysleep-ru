import jsdoc from 'eslint-plugin-jsdoc'
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
          { group: ['~/utils/**'], message: 'Утилиты автоимпортируются.' },
          { group: ['~/stores/**'], message: 'Сторы автоимпортируются.' },
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
    files: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      'max-params': ['error', 3],
      // cv.ts nests three levels in six places, so 3 is what holds today.
      'max-depth': ['error', 3],
      'no-negated-condition': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx'], location: 'anywhere' }],
      'vue/require-explicit-emits': 'error',
      'vue/no-unused-emit-declarations': 'error',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/padding-line-between-blocks': ['error', 'always'],
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        // The fixer would insert empty stubs that then pass the rule.
        enableFixer: false,
        require: { FunctionDeclaration: true, ArrowFunctionExpression: false },
        // Only `export const fn = () => {}`: the methods of an exported object are
        // described by the comment on that object.
        contexts: ['ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression'],
      }],
    },
  },

  // Sits apart from the rules above because it needs the type information: a missed
  // await compiles and passes the tests, and then fails silently in production.
  {
    files: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts'],
    // Run by hand and left out of the tsconfig, so the type service cannot see it.
    ignores: ['server/db/seed.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.vue'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
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
