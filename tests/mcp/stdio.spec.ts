// @vitest-environment node
import { afterEach, expect, test } from 'vitest'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { resolve } from 'node:path'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close()
})

test('запущенный stdio MCP отвечает клиенту и читает API без доступа к БД', async () => {
  const requests: Array<{ url?: string; authorization?: string }> = []
  const api = createServer((request, response) => {
    requests.push({ url: request.url, authorization: request.headers.authorization })
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ resource: 'pages', recordId: 1, version: 'test-version', data: { ru: {}, en: {} } }))
  })
  await new Promise<void>(resolve => api.listen(0, '127.0.0.1', resolve))
  const address = api.address() as { port: number }
  const token = 'local_test_token_'.padEnd(64, 'x')
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('scripts/content-mcp.mjs')],
    env: { CONTENT_API_URL: `http://127.0.0.1:${address.port}`, CONTENT_API_TOKEN: token },
    stderr: 'pipe',
  })
  const client = new Client({ name: 'stdio-integration', version: '1.0.0' })
  cleanups.push(async () => { await client.close(); await new Promise<void>(resolve => api.close(() => resolve())) })
  await client.connect(transport)
  expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(['list_content_records', 'get_content'])
  expect(requests).toHaveLength(0)
  const result = await client.callTool({ name: 'get_content', arguments: { resource: 'pages', recordId: 1 } })
  expect(result.isError).not.toBe(true)
  expect(result.content).toEqual([{ type: 'text', text: JSON.stringify({ resource: 'pages', recordId: 1, version: 'test-version', data: { ru: {}, en: {} } }) }])
  expect(requests).toEqual([{ url: '/api/content/snapshot?resource=pages&recordId=1', authorization: `Bearer ${token}` }])
}, 15000)

test('ошибка настройки процесса не раскрывает ключ и не пишет мусор в stdout протокола', async () => {
  const secret = 'do_not_log_this_key'
  const child = spawn(process.execPath, [resolve('scripts/content-mcp.mjs')], {
    env: { CONTENT_API_URL: `https://${secret}.example`, CONTENT_API_TOKEN: secret },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  const code = await new Promise<number | null>((resolve, reject) => { child.on('close', resolve); child.on('error', reject) })
  expect(code).toBe(1)
  expect(stdout).toBe('')
  expect(stderr).toContain('Content MCP не запущен')
  expect(stderr).not.toContain(secret)
}, 15000)
