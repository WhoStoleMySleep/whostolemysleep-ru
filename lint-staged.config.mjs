export default {
  '*.{ts,mjs,vue}': [
    'eslint --fix',
    'vitest related --run --passWithNoTests',
  ],
}
