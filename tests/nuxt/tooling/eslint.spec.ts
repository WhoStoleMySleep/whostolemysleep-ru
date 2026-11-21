import { beforeAll, describe, expect, test } from 'vitest'
import type { ESLint } from 'eslint'

let eslint: ESLint
let syntaxLint: ESLint
const root = process.cwd()

beforeAll(async () => {
  const { ESLint } = await import('eslint')
  eslint = new ESLint({ cwd: root, fix: false })
  // Synthetic syntax examples have no TypeScript project; promise guards are checked separately.
  syntaxLint = new ESLint({
    cwd: root,
    fix: false,
    overrideConfig: {
      files: ['shared/utils/site.ts'],
      languageOptions: { parserOptions: { projectService: false } },
      rules: {
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
      },
    },
  })
})

async function violations(code: string, filePath = 'shared/utils/site.ts') {
  const [result] = await syntaxLint.lintText(code, { filePath })
  return result!.messages.map(message => message.ruleId)
}

describe('Обязательные правила чистого кода', () => {
  test.each([
    { name: 'длинная функция', rule: 'max-lines-per-function', code: `function work() {\n${'  work()\n'.repeat(21)}}` },
    { name: 'четыре параметра', rule: 'max-params', code: 'function work(a, b, c, d) { return [a, b, c, d] }' },
    { name: 'третий уровень вложенности', rule: 'max-depth', code: 'function work(items) { for (const row of items) { for (const cell of row) { if (cell) { work(cell) } } } }' },
    { name: 'изменение данных параметра', rule: 'no-param-reassign', code: 'function work(item) { item.name = "new" }' },
    { name: 'необъяснённое число', rule: '@typescript-eslint/no-magic-numbers', code: 'function work(value) { return value * 37 }' },
    { name: 'публичная функция без документации', rule: 'jsdoc/require-jsdoc', code: 'export function work() { return true }' },
  ])('$name блокирует проверку', async ({ code, rule }) => {
    expect(await violations(code)).toContain(rule)
  }, 15000)

  test('копия данных и именованная числовая константа допустимы', async () => {
    const rules = await violations('const LIMIT = 37; function work(item) { return { ...item, limit: LIMIT } }')
    expect(rules).not.toContain('no-param-reassign')
    expect(rules).not.toContain('@typescript-eslint/no-magic-numbers')
  })

  test.each(['event', 'context', 'target'])('изменение %s допустимо по контракту API', async (parameter) => {
    expect(await violations(`function work(${parameter}) { ${parameter}.value = true }`)).not.toContain('no-param-reassign')
  })

  test('пустые строки и комментарии не увеличивают длину функции', async () => {
    expect(await violations(`function work() {\n${'\n  // Why this branch exists.\n'.repeat(25)}  return true\n}`)).not.toContain('max-lines-per-function')
  })

  test.each(['app/composables/useLocale.ts', 'app/stores/admin.ts', 'app/plugins/api.ts', 'server/plugins/logger.ts'])('фабрика %s освобождена только от ограничения длины', async (filePath) => {
    const config = await eslint.calculateConfigForFile(filePath)
    expect(config.rules['max-lines-per-function'][0]).toBe(0)
    expect(config.rules['max-depth']).toEqual([2, 2])
    expect(config.rules['no-param-reassign'][0]).toBe(2)
  })

  test.each(['shared/schemas/post.ts', 'server/db/schema.ts'])('схема %s может объявлять числовые ограничения', async (filePath) => {
    const config = await eslint.calculateConfigForFile(filePath)
    expect(config.rules['@typescript-eslint/no-magic-numbers'][0]).toBe(0)
    expect(config.rules['max-lines-per-function'][0]).toBe(2)
  })

  test('контроль необработанных промисов остаётся включённым', async () => {
    const config = await eslint.calculateConfigForFile('server/utils/auth.ts')
    for (const rule of ['no-floating-promises', 'no-misused-promises', 'await-thenable']) {
      expect(config.rules[`@typescript-eslint/${rule}`][0]).toBe(2)
    }
  })
})
