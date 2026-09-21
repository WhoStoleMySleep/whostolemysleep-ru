/**
 * Печатает две строки для .env: ADMIN_JWT_SECRET и ADMIN_PASSWORD_HASH.
 *
 * Пароль читается со скрытым вводом — чтобы он не остался ни в истории
 * командной строки, ни на экране. Запускать: node scripts/admin-secrets.mjs
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

const password = await askHidden('Новый пароль админки: ')

if (password.length < 12) {
  console.error('\nСлишком короткий — нужно хотя бы 12 символов.')
  process.exit(1)
}

console.log('\nДобавьте в .env (и в переменные окружения Vercel):\n')
console.log(`ADMIN_JWT_SECRET="${randomBytes(32).toString('base64')}"`)
console.log(`ADMIN_PASSWORD_HASH="${bcrypt.hashSync(password, 12)}"`)
console.log('\nADMIN_JWT_SECRET меняется — все текущие сессии в админке завершатся.')
