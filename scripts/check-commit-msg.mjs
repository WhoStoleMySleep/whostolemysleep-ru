import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const MAX_LENGTH = 64
const FORMAT = /^(?:feat|fix|refactor|perf|test|docs|style|chore): \S/
// Written by git itself: `git merge`, `git revert` and `git commit --fixup`.
const GENERATED = /^(?:Merge |Revert "|fixup! |squash! |amend! )/

/** Returns what is wrong with a commit subject, or null when there is nothing to report. */
export function findSubjectProblem(subject) {
  if (GENERATED.test(subject)) return null
  if (!FORMAT.test(subject)) return 'expected "{type}: {subject}", type: feat, fix, refactor, perf, test, docs, style, chore'
  if ([...subject].length > MAX_LENGTH) return `longer than ${MAX_LENGTH} characters`
  return null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [subject = ''] = readFileSync(process.argv[2], 'utf8').split('\n')
  const problem = findSubjectProblem(subject)
  if (problem) {
    console.error(`commit-msg: ${problem}\n  ${subject}`)
    process.exit(1)
  }
}
