const TESTS = 'vitest related --run --passWithNoTests'

// One glob per extension: lint-staged runs globs in parallel, and a file matched by
// two of them would be rewritten by two fixers at once.
export default {
  '*.{ts,mjs}': ['eslint --fix', TESTS],
  '*.vue': ['eslint --fix', 'stylelint --fix', TESTS],
  '*.css': 'stylelint --fix',
}
