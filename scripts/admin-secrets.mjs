/**
 * Prints the two lines for .env: ADMIN_JWT_SECRET and ADMIN_PASSWORD_HASH.
 *
 * The password is read with hidden input, so it stays out of the shell history and
 * off the screen. Run with: node scripts/admin-secrets.mjs
 */
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import bcrypt from 'bcryptjs'

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    const write = rl._writeToOutput.bind(rl)
    rl._writeToOutput = (s) => write(s.startsWith(question) ? s : '')
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

const password = await askHidden('New admin password: ')

if (password.length < 12) {
  console.error('\nToo short — 12 characters at least.')
  process.exit(1)
}

console.log('\nAdd to .env (and to the Vercel project environment):\n')
console.log(`ADMIN_JWT_SECRET="${randomBytes(32).toString('base64')}"`)
console.log(`ADMIN_PASSWORD_HASH="${bcrypt.hashSync(password, 12)}"`)
console.log('\nChanging ADMIN_JWT_SECRET ends every open admin session.')
