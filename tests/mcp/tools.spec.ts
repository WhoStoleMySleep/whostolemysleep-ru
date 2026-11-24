// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close()
})

async function connect(permissions = {}) {
  const { createContentServer } = await import('../../scripts/content/tools.mjs')
  const operations = {
    records: vi.fn(async (_input: unknown) => [{ id: 1, label: 'Pages' }]),
    snapshot: vi.fn(async (_input: unknown) => ({ version: 'v1', data: {} })),
    plan: vi.fn(async (_input: unknown) => ({ id: 'plan', status: 'pending', diff: [] })),
    project: vi.fn(async (_input: unknown) => ({ id: 'project-plan', operation: 'create-project', status: 'pending' })),
    apply: vi.fn(async (_input: unknown) => ({ status: 'applied' })),
  }
  const server = createContentServer({ client: operations, ...permissions })
  const client = new Client({ name: 'content-tests', version: '1.0.0' })
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  await client.connect(clientTransport)
  cleanups.push(async () => { await client.close(); await server.close() })
  return { client, operations }
}

describe('Ограниченные MCP-инструменты', () => {
  test('по умолчанию предоставляет только чтение', async () => {
    const { client } = await connect()
    const { tools } = await client.listTools()
    expect(tools.map(tool => tool.name)).toEqual(['list_content_records', 'get_content'])
    expect(tools.every(tool => tool.annotations?.readOnlyHint)).toBe(true)
    const result = await client.callTool({ name: 'list_content_records', arguments: { resource: 'pages' } })
    expect(result.content).toEqual([{ type: 'text', text: '[{"id":1,"label":"Pages"}]' }])
  })

  test('подготовка плана не включает применение или одобрение', async () => {
    const { client, operations } = await connect({ allowPlan: true })
    const names = (await client.listTools()).tools.map(tool => tool.name)
    expect(names).toContain('prepare_content_change')
    expect(names).not.toContain('apply_content_change')
    expect(names.some(name => name.includes('approve'))).toBe(false)
    const args = { resource: 'pages', recordId: 1, expectedVersion: 'v1', patch: { ru: { 'hero.line1': 'Текст' } } }
    await client.callTool({ name: 'prepare_content_change', arguments: args })
    expect(operations.plan).toHaveBeenCalledExactlyOnceWith(args)
    expect(operations.apply).not.toHaveBeenCalled()
  })

  test('создание проекта требует отдельного флага и не включает публикацию или approve', async () => {
    const hidden = await connect({ allowPlan: true })
    expect((await hidden.client.listTools()).tools.map(tool => tool.name)).not.toContain('prepare_project_page')
    const { client, operations } = await connect({ allowPlan: true, allowCreateProject: true })
    const tools = (await client.listTools()).tools
    expect(tools.map(tool => tool.name)).toContain('prepare_project_page')
    expect(tools.some(tool => /approve|publish/.test(tool.name))).toBe(false)
    const args = { slug: 'test-project', title_ru: 'Проект', title_en: 'Project', text_ru: '<p>Кейс</p>', text_en: '<p>Case</p>', excerpt_ru: 'Текст', excerpt_en: 'Text', tags: ['Nuxt'] }
    const result = await client.callTool({ name: 'prepare_project_page', arguments: args })
    expect(result.isError).not.toBe(true)
    expect(operations.project).toHaveBeenCalledExactlyOnceWith(args)
    expect(operations.apply).not.toHaveBeenCalled()
    await client.callTool({ name: 'prepare_project_page', arguments: { ...args, is_published: true } })
    expect(operations.project).toHaveBeenCalledTimes(1)
  })

  test('применение принимает только ID и помечено изменяющим данные', async () => {
    const { client, operations } = await connect({ allowApply: true })
    const apply = (await client.listTools()).tools.find(tool => tool.name === 'apply_content_change')!
    expect(apply.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: true })
    const planId = '38e26a18-53b0-4930-8b98-65eb20195821'
    await client.callTool({ name: 'apply_content_change', arguments: { planId } })
    expect(operations.apply).toHaveBeenCalledExactlyOnceWith({ planId })
  })

  test.each([
    { resource: 'user' },
    { resource: 'pages', url: 'https://evil.example' },
    { resource: 'pages', sql: 'select 1' },
  ])('не передаёт недопустимые поля или ресурсы в API', async (args) => {
    const { client, operations } = await connect()
    const result = await client.callTool({ name: 'list_content_records', arguments: args })
    expect(result.isError).toBe(true)
    expect(operations.records).not.toHaveBeenCalled()
  })

  test('ошибка одобрения остаётся ошибкой, а не успешным сохранением', async () => {
    const { client, operations } = await connect({ allowApply: true })
    operations.apply.mockRejectedValue(new Error('План не одобрен в админке'))
    const result = await client.callTool({ name: 'apply_content_change', arguments: { planId: '38e26a18-53b0-4930-8b98-65eb20195821' } })
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([{ type: 'text', text: 'План не одобрен в админке' }])
  })
})
