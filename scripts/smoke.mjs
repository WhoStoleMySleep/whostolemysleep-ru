/**
 * Boots .output/server/index.mjs and checks that it answers.
 *
 * Every other check reads the source through Vite, which resolves modules its own
 * way; this one runs what actually ships and drags the whole server bundle plus the
 * Vue renderer through a real module loader.
 *
 * It is not a guarantee that the deployment works. Vercel loads modules differently
 * again, and sanitize-html 2.17.6 proved it: unloadable there, perfectly fine here on
 * the same Node version. .github/workflows/deployed.yml covers that side.
 *
 * No database is configured: content requests may fail, but page rendering and
 * the shape of the hydration payload must still work in the shipped bundle.
 *
 * Run with: node scripts/smoke.mjs
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = process.env.SMOKE_PORT ?? '3210'
const BASE = `http://127.0.0.1:${PORT}`

const CHECKS = [
  { path: '/admin', expect: 302 },
  { path: '/en/this-page-does-not-exist', expect: 404 },
  { path: '/ru', expect: 200, inlinePayload: true },
  { path: '/en', expect: 200, inlinePayload: true },
]

const server = spawn('node', ['.output/server/index.mjs'], {
  env:   { ...process.env, PORT, NITRO_PORT: PORT },
  stdio: ['ignore', 'pipe', 'pipe'],
})

// Nothing here is configured, so every route that reaches the database logs a stack
// trace nobody needs to read. The output is kept and printed only if a check fails,
// where the reason for the failure is usually in it.
let output = ''
server.stdout.on('data', (chunk) => { output += chunk })
server.stderr.on('data', (chunk) => { output += chunk })

let exited = null
server.on('exit', (code, signal) => { exited = signal ?? code })

async function waitForListen() {
  for (let i = 0; i < 60; i++) {
    if (exited !== null) return false
    try {
      await fetch(`${BASE}/robots.txt`)
      return true
    }
    catch {
      await sleep(500)
    }
  }
  return false
}

function stop() {
  if (exited === null) server.kill('SIGKILL')
}

// A 200 page can still hydrate with an older, separately cached payload.
function inlinePayloadError(html) {
  const script = html.match(/<script\b([^>]*\bid="__NUXT_DATA__"[^>]*)>([\s\S]*?)<\/script>/)
  if (!script) return 'Nuxt hydration payload is missing'
  if (/\bdata-src\s*=/.test(script[1])) return 'hydration uses a separately cached payload'
  try {
    const payload = JSON.parse(script[2])
    const root = Array.isArray(payload[0]) ? payload[payload[0][1]] : payload[0]
    if (!Object.hasOwn(root ?? {}, 'data')) return 'SSR data is missing from the inline payload'
  } catch {
    return 'inline payload is not valid JSON'
  }
  return ''
}

if (!await waitForListen()) {
  console.error(exited === null
    ? `smoke: the server did not answer on ${BASE} within 30s`
    : `smoke: the server exited with ${exited} before it started listening`)
  console.error(output)
  stop()
  process.exit(1)
}

let failed = false

for (const { path, expect, inlinePayload } of CHECKS) {
  let status
  try {
    const response = await fetch(`${BASE}${path}`, { redirect: 'manual' })
    status = response.status
    if (inlinePayload && status === expect) {
      const error = inlinePayloadError(await response.text())
      console.log(`smoke: ${error ? 'FAIL' : 'ok  '} ${path} — ${error || 'hydration data is inline'}`)
      if (error) failed = true
    }
  }
  catch (error) {
    console.error(`smoke: ${path} — request failed: ${error.message}`)
    failed = true
    continue
  }
  const ok = status === expect
  console.log(`smoke: ${ok ? 'ok  ' : 'FAIL'} ${status} ${path} (expected ${expect})`)
  if (!ok) failed = true
}

// A module that Node refuses to load takes the whole process down rather than
// failing one request, so staying alive is a result in itself.
if (exited !== null) {
  console.error(`smoke: the server exited with ${exited} while serving`)
  failed = true
}

if (failed) console.error(output)

stop()
process.exit(failed ? 1 : 0)
