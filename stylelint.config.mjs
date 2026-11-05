export default {
  extends: ['stylelint-config-recommended'],
  rules: {
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['deep', 'global', 'slotted'] }],
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    // Reports a base rule placed after its :hover or :lang() variant, where the order
    // is deliberate and the two never compete.
    'no-descending-specificity': null,
  },
  overrides: [
    {
      // Styles live in <style> blocks; without this syntax Stylelint cannot see them.
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
    {
      // main.css defines the theme tokens, and /cv is a printable sheet that must
      // stay black on white in either theme, so it cannot use them.
      files: ['app/assets/css/main.css', 'app/pages/cv.vue'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
      },
    },
  ],
}
