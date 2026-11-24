// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { createError } from 'h3'
import type { ContentActor } from '~~/server/utils/contentAuth'

const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('~~/server/db', () => ({ db: new Proxy({}, { get: (_, key) => Reflect.get(state.db as object, key) }) }))
vi.mock('~~/server/utils/pending', async original => ({ ...await original<object>(), flushPending: vi.fn(async () => ({ ok: true, failed: [] })) }))
const pg = new PGlite()
const tokenId = '11111111-1111-4111-8111-111111111111'
const actor: ContentActor = { id: `token:${tokenId}`, tokenId, environment: 'development', resources: ['post'], scopes: ['plan', 'apply', 'create-project'] }
const admin: ContentActor = { id: 'admin', tokenId: null, environment: 'development', resources: [], scopes: [] }
const input = {
  slug: 'isolated-project', title_ru: 'Проект', title_en: 'Project', text_ru: '<p>Кейс</p>', text_en: '<p>Case</p>',
  excerpt_ru: 'Описание', excerpt_en: 'Description', url: null, tags: ['Nuxt'],
  images: [{ url: 'https://example.org/screenshot.png', alt_ru: 'Главная', alt_en: 'Home' }],
}

beforeAll(async () => {
  const journal = JSON.parse(await readFile(new URL('../../../../server/db/migrations/meta/_journal.json', import.meta.url), 'utf8'))
  for (const entry of journal.entries) await pg.exec(await readFile(new URL(`../../../../server/db/migrations/${entry.tag}.sql`, import.meta.url), 'utf8'))
  state.db = drizzle(pg)
}, 60000)
afterAll(async () => { await pg.close() })
beforeEach(async () => {
  vi.stubGlobal('createError', createError)
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
  await pg.exec('truncate content_history, content_plan, content_token, post, tag, image, post_tag, pending_revalidation restart identity cascade')
  await pg.query(`insert into content_token(id,environment,label,secret_hash,resources,scopes,expires_at)
    values($1,'development','isolated','hash','["post"]','["plan","apply","create-project"]',now()+interval '1 day')`, [tokenId])
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

async function planned() {
  const { createProjectPlan } = await import('~~/server/utils/contentProject')
  return createProjectPlan(actor, input)
}
async function approved() {
  const { approveContentPlan } = await import('~~/server/utils/contentPlans')
  return approveContentPlan(admin, (await planned()).id)
}
async function counts() {
  return (await pg.query<{ posts: number; tags: number; images: number; links: number; audits: number; queued: number }>(`select
    (select count(*)::int from post) posts, (select count(*)::int from tag) tags, (select count(*)::int from image) images,
    (select count(*)::int from post_tag) links, (select count(*)::int from content_history) audits, (select count(*)::int from pending_revalidation) queued`)).rows[0]
}

describe('Создание страницы проекта на изолированном PostgreSQL', () => {
  test('реальный stdio MCP из другого каталога создаёт проект через API только после admin approve', async () => {
    const { createProjectPlan } = await import('~~/server/utils/contentProject')
    const { approveContentPlan } = await import('~~/server/utils/contentPlans')
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const repository = await mkdtemp(join(tmpdir(), 'mcp-source-project-'))
    await writeFile(join(repository, 'README.md'), '# Test project\nA Nuxt project fixture.\n')
    const credential = 'isolated_stdio_token_'.padEnd(64, 'x')
    const api = createServer(async (request, response) => {
      if (request.headers.authorization !== `Bearer ${credential}`) { response.writeHead(401).end(); return }
      try {
        const chunks: Buffer[] = []
        for await (const chunk of request) chunks.push(Buffer.from(chunk))
        const body = JSON.parse(Buffer.concat(chunks).toString())
        const result = request.url === '/api/content/projects/plan' ? await createProjectPlan(actor, body)
          : request.url === '/api/content/apply' ? await applyContentPlan(actor, body.planId) : null
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(result))
      } catch { response.writeHead(403, { 'Content-Type': 'application/json' }).end('{}') }
    })
    await new Promise<void>(resolve => api.listen(0, '127.0.0.1', resolve))
    const address = api.address() as { port: number }
    const client = new Client({ name: 'other-repository-smoke', version: '1.0.0' })
    try {
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('scripts/content-mcp.mjs')], cwd: repository,
        env: { CONTENT_API_URL: `http://127.0.0.1:${address.port}`, CONTENT_API_TOKEN: credential, CONTENT_MCP_ALLOW_PLAN: 'true', CONTENT_MCP_ALLOW_APPLY: 'true', CONTENT_MCP_ALLOW_CREATE_PROJECT: 'true' }, stderr: 'pipe' }))
      expect((await client.listTools()).tools.map(tool => tool.name)).toContain('prepare_project_page')
      const prepared = await client.callTool({ name: 'prepare_project_page', arguments: input })
      expect(prepared.isError).not.toBe(true)
      const block = (prepared.content as { type: string; text: string }[]).find(block => block.type === 'text')!
      const plan = JSON.parse(block.text)
      expect((await counts())!.posts).toBe(0)
      expect((await client.callTool({ name: 'apply_content_change', arguments: { planId: plan.id } })).isError).toBe(true)
      await approveContentPlan(admin, plan.id)
      expect((await client.callTool({ name: 'apply_content_change', arguments: { planId: plan.id } })).isError).not.toBe(true)
      expect(await counts()).toMatchObject({ posts: 1, tags: 1, images: 1, links: 1, audits: 1 })
    } finally {
      await client.close()
      await new Promise<void>(resolve => api.close(() => resolve()))
      await rm(repository, { recursive: true, force: true })
    }
  }, 30000)

  test.each([
    { is_published: true }, { type: 'blog' }, { token_id: tokenId }, { title_ru: '<b>HTML</b>' },
    { url: 'javascript:alert(1)' }, { images: [{ url: '/private/file.png', alt_ru: '', alt_en: '' }] },
    { tags: ['Nuxt', 'Nuxt'] }, { text_en: '<script>bad()</script>' },
  ])('не принимает служебные поля и небезопасный контент: %j', async patch => {
    const { createProjectPlan } = await import('~~/server/utils/contentProject')
    await expect(createProjectPlan(actor, { ...input, ...patch } as typeof input)).rejects.toThrow()
    expect(await counts()).toEqual({ posts: 0, tags: 0, images: 0, links: 0, audits: 0, queued: 0 })
  })

  test('план не создаёт проект или связи, показывает очищенный контент и черновик', async () => {
    const { createProjectPlan } = await import('~~/server/utils/contentProject')
    const result = await createProjectPlan(actor, { ...input, text_ru: '<p onclick="bad()">Кейс</p><script>bad()</script>' })
    expect(result).toMatchObject({ operation: 'create-project', resource: 'post', before: {}, after: { type: 'project', is_published: false, text_ru: '<p>Кейс</p>', tags: ['Nuxt'] } })
    expect(await counts()).toEqual({ posts: 0, tags: 0, images: 0, links: 0, audits: 0, queued: 0 })
  })

  test('одобрение само не пишет проект, apply атомарно создаёт черновик и все связи', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const plan = await approved()
    expect((await counts())!.posts).toBe(0)
    await applyContentPlan(actor, plan.id)
    expect(await counts()).toMatchObject({ posts: 1, tags: 1, images: 1, links: 1, audits: 1 })
    expect((await counts())!.queued).toBeGreaterThan(0)
    expect((await pg.query('select id,type,is_published,is_pinned from post')).rows).toEqual([{ id: plan.recordId, type: 'project', is_published: false, is_pinned: false }])
    await applyContentPlan(actor, plan.id)
    expect(await counts()).toMatchObject({ posts: 1, tags: 1, images: 1, links: 1, audits: 1 })
  })

  test('токен не одобряет план и не применяет pending', async () => {
    const { approveContentPlan } = await import('~~/server/utils/contentPlans')
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const plan = await planned()
    await expect(approveContentPlan(actor, plan.id)).rejects.toThrow('Admin approval')
    await expect(applyContentPlan(actor, plan.id)).rejects.toThrow('admin approval')
    expect((await counts())!.posts).toBe(0)
  })

  test('старый токен не получает право создания, включая admin apply его плана', async () => {
    const { createProjectPlan } = await import('~~/server/utils/contentProject')
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    await expect(createProjectPlan({ ...actor, scopes: ['plan', 'apply'] }, input)).rejects.toThrow('scope')
    const plan = await approved()
    await pg.exec(`update content_token set scopes='["plan","apply"]'`)
    await expect(applyContentPlan(admin, plan.id)).rejects.toThrow('conflict')
    expect((await counts())!.posts).toBe(0)
  })

  test('параллельные apply одного плана создают одну страницу и один audit', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const plan = await approved()
    await Promise.all([applyContentPlan(actor, plan.id), applyContentPlan(actor, plan.id)])
    expect(await counts()).toMatchObject({ posts: 1, tags: 1, images: 1, links: 1, audits: 1 })
  })

  test('два плана с одним slug не перезаписывают друг друга', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const first = await approved()
    const second = await approved()
    await applyContentPlan(actor, first.id)
    await expect(applyContentPlan(actor, second.id)).rejects.toThrow('conflict')
    expect(await counts()).toMatchObject({ posts: 1, tags: 1, images: 1, links: 1, audits: 1 })
  })

  test('изменение существующего тега после preview блокирует создание', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    await pg.exec(`insert into tag(slug,name_ru,name_en) values('nuxt','Nuxt','Nuxt')`)
    const plan = await approved()
    await pg.exec(`update tag set name_ru='Другой стек'`)
    await expect(applyContentPlan(actor, plan.id)).rejects.toThrow('conflict')
    expect(await counts()).toMatchObject({ posts: 0, tags: 1, images: 0, links: 0, audits: 0 })
  })

  test('тег, появившийся после подготовки плана, не дублируется при apply', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const plan = await approved()
    await pg.exec(`insert into tag(slug,name_ru,name_en) values('nuxt','Nuxt','Nuxt')`)
    await expect(applyContentPlan(actor, plan.id)).rejects.toThrow('conflict')
    expect(await counts()).toEqual({ posts: 0, tags: 1, images: 0, links: 0, audits: 0, queued: 0 })
  })

  test.each(['content_history', 'pending_revalidation'])('сбой %s откатывает проект, теги, картинки и статус', async (table) => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const plan = await approved()
    await pg.exec(`create function fail_write() returns trigger language plpgsql as $$ begin raise exception 'isolated failure'; end $$;
      create trigger fail_write before insert on ${table} for each row execute function fail_write()`)
    try {
      await expect(applyContentPlan(actor, plan.id)).rejects.toThrow()
      expect(await counts()).toEqual({ posts: 0, tags: 0, images: 0, links: 0, audits: 0, queued: 0 })
      expect((await pg.query('select status from content_plan')).rows).toEqual([{ status: 'approved' }])
    } finally { await pg.exec(`drop trigger fail_write on ${table}; drop function fail_write()`)}
  })
})
