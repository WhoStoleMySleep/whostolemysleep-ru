import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { PAGE_DEFAULTS, type PageCopy } from '~~/shared/content/registry'
import { contentFieldNames, pageCopySchema } from '~~/shared/content/schemas'
import type { ContentEnvironment, ContentRecord, ContentResource, ContentSnapshot } from '~~/shared/content/types'
import { parseContentInput } from './contentInput'

/** Статический реестр исключает SQL identifiers из клиентского ввода. */
export const CONTENT_TABLES = {
  pages: { table: 'page_content', label: 'environment' }, post: { table: 'post', label: 'title_ru' },
  about: { table: 'about_me', label: 'id' }, settings: { table: 'settings', label: 'id' },
  experience: { table: 'experience', label: 'company_ru' }, education: { table: 'education', label: 'institution' },
  skill: { table: 'skill', label: 'name' }, 'skill-group': { table: 'skill_group', label: 'name_ru' },
} as const

/** Внутренний raw state никогда не отправляется клиенту. */
export interface LoadedContent { snapshot: ContentSnapshot; state: Record<string, unknown> }

/** Каноническое представление стабильно при другом порядке JSON-ключей. */
export function canonicalContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalContent).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalContent(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** Версия учитывает состояние строки и defaults текущего релиза. */
export function contentVersion(state: Record<string, unknown>, data: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalContent({ state, data })).digest('hex')
}

/** Никакого merge вложенных произвольных объектов — только два известных языка. */
export function effectivePageCopy(overrides: PageCopy): PageCopy {
  return { ru: { ...PAGE_DEFAULTS.ru, ...overrides.ru }, en: { ...PAGE_DEFAULTS.en, ...overrides.en } }
}

function publicRecord(resource: ContentResource, state: Record<string, unknown>): Record<string, unknown> {
  if (resource === 'pages') return effectivePageCopy(parseContentInput(pageCopySchema, state.data) as PageCopy)
  return Object.fromEntries(contentFieldNames(resource).map(key => [key, normalizedValue(key, state[key])]))
}

function normalizedValue(key: string, value: unknown): unknown {
  if (key !== 'published_at' || typeof value !== 'string') return value
  const utc = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  return new Date(utc).toISOString()
}

/** Непубличные таблицы вообще отсутствуют в реестре ресурсов. */
export async function listContentRecords(resource: ContentResource): Promise<ContentRecord[]> {
  if (resource === 'pages') return [{ id: 1, label: 'Page copy / RU + EN' }]
  const definition = CONTENT_TABLES[resource]
  const result = await db.execute<{ id: number; label: string }>(sql`select id, ${sql.identifier(definition.label)}::text as label from ${sql.identifier(definition.table)} order by id limit 1000`)
  return result.rows
}

/** Один SELECT возвращает и snapshot, и точное состояние для последующего CAS. */
export async function loadContent(resource: ContentResource, recordId: number, environment: ContentEnvironment): Promise<LoadedContent> {
  if (resource === 'pages' && recordId !== 1) throw createError({ statusCode: 404, message: 'Content record not found' })
  const table = sql.identifier(CONTENT_TABLES[resource].table)
  const where = resource === 'pages' ? sql`environment = ${environment}` : sql`id = ${recordId}`
  const result = await db.execute<{ state: Record<string, unknown> }>(sql`select to_jsonb(live) as state from ${table} live where ${where} limit 1`)
  const state = result.rows[0]?.state
  if (!state) throw createError({ statusCode: 404, message: 'Content record not found' })
  const data = publicRecord(resource, state)
  return { state, snapshot: { resource, recordId, version: contentVersion(state, data), data } }
}

/** Только отсутствие именно новой таблицы допускает fallback до миграции. */
export function isMissingPageContentTable(error: unknown): boolean {
  const candidate = error as { code?: string; table?: string; message?: string; cause?: unknown }
  if (candidate?.code === '42P01') return candidate.table === 'page_content' || /relation "(?:public\.)?page_content" does not exist/.test(candidate.message ?? '')
  return candidate?.cause !== undefined && candidate.cause !== error && isMissingPageContentTable(candidate.cause)
}

/** Чтение никогда не создаёт singleton и не маскирует прочие ошибки БД. */
export async function readPublicPageContent(environment: ContentEnvironment): Promise<PageCopy> {
  try {
    const result = await db.execute<{ data: PageCopy }>(sql`select data from page_content where environment = ${environment} limit 1`)
    return result.rows[0] ? parseContentInput(pageCopySchema, result.rows[0].data) as PageCopy : { ru: {}, en: {} }
  } catch (error) {
    if (isMissingPageContentTable(error)) return { ru: {}, en: {} }
    throw error
  }
}
