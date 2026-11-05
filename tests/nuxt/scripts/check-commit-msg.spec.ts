import { describe, expect, it } from 'vitest'
import { findSubjectProblem } from '../../../scripts/check-commit-msg.mjs'

describe('findSubjectProblem', () => {
  it('accepts every allowed type', () => {
    for (const type of ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'style', 'chore']) {
      expect(findSubjectProblem(`${type}: добавить фильтр`)).toBeNull()
    }
  })

  it('rejects an unknown type, a scope and a missing subject', () => {
    expect(findSubjectProblem('feature: добавить фильтр')).toMatch(/expected/)
    expect(findSubjectProblem('feat(blog): добавить фильтр')).toMatch(/expected/)
    expect(findSubjectProblem('feat: ')).toMatch(/expected/)
    expect(findSubjectProblem('')).toMatch(/expected/)
  })

  it('counts characters rather than bytes, with the limit at exactly 64', () => {
    const prefix = 'feat: '
    expect(findSubjectProblem(prefix + 'я'.repeat(64 - prefix.length))).toBeNull()
    expect(findSubjectProblem(prefix + 'я'.repeat(65 - prefix.length))).toMatch(/longer/)
  })

  it('lets through subjects written by git itself', () => {
    expect(findSubjectProblem('Merge branch \'main\' into feature')).toBeNull()
    expect(findSubjectProblem('Revert "feat: добавить фильтр"')).toBeNull()
    expect(findSubjectProblem('fixup! feat: добавить фильтр')).toBeNull()
  })
})
