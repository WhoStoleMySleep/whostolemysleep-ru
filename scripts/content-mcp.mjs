import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { createContentClient } from './content/client.mjs'
import { createContentServer } from './content/tools.mjs'

async function start() {
  const client = createContentClient({
    baseUrl: process.env.CONTENT_API_URL ?? 'http://127.0.0.1:3000',
    environment: process.env.CONTENT_MCP_ENVIRONMENT ?? 'development',
    token: process.env.CONTENT_API_TOKEN,
  })
  const server = createContentServer({
    client,
    allowPlan: process.env.CONTENT_MCP_ALLOW_PLAN === 'true',
    allowApply: process.env.CONTENT_MCP_ALLOW_APPLY === 'true',
  })
  await server.connect(new StdioServerTransport())
}

try {
  await start()
} catch {
  // stdout занят протоколом; конфигурацию и ключ нельзя включать даже в ошибку запуска.
  console.error('Content MCP не запущен: проверьте ключ, разрешённый адрес и среду. См. docs/content-admin.md.')
  process.exitCode = 1
}
