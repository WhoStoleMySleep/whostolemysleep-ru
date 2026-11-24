import { z } from 'zod'
import { PAGE_FIELDS } from './registry'
import type { ContentResource } from './types'

export const CONTENT_RESOURCES = ['pages', 'post', 'about', 'settings', 'experience', 'education', 'skill', 'skill-group'] as const
export const CONTENT_SCOPES = ['read', 'plan', 'apply'] as const
const TITLE_LIMIT = 500
const NAME_LIMIT = 255
const SLUG_LIMIT = 100
const POST_SLUG_LIMIT = 255
const URL_LIMIT = 1000
const TEXT_LIMIT = 100000
const EMAIL_LIMIT = 254
const TOKEN_LABEL_LIMIT = 100
const MAX_TOKEN_DAYS = 90
const MAX_PATCH_KEYS = 64
const HASH_LENGTH = 64
const MAX_SORT_ORDER = 100000

/** Plain text не должен стать HTML при повторной обработке. */
export function plainContentText(maxLength: number) {
  return z.string().max(maxLength).refine(value => !/[<>]|&(?:#\w+|lt|gt);/i.test(value), 'Plain text required')
}

function pageText(field: typeof PAGE_FIELDS[number]) {
  return plainContentText(field.maxLength).refine(value => {
    const placeholders = value.match(/\{[^{}]*\}/g) ?? []
    const rest = value.replace(/\{years\}/g, '')
    if (field.key === 'hero.lede') return placeholders.length === 1 && placeholders[0] === '{years}' && !/[{}]/.test(rest)
    return !/[{}]/.test(value)
  }, 'Invalid placeholders: hero.lede must contain exactly {years}')
}

const pageLocaleSchema = z.strictObject(Object.fromEntries(PAGE_FIELDS.map(field => [field.key, pageText(field).optional()])))
export const pageCopySchema = z.strictObject({ ru: pageLocaleSchema, en: pageLocaleSchema })
export const pagePatchSchema = z.strictObject({ ru: pageLocaleSchema.optional(), en: pageLocaleSchema.optional() })
  .refine(value => Object.values(value).some(locale => Object.keys(locale ?? {}).length > 0), 'Empty patch')

const plain = plainContentText(TITLE_LIMIT)
const name = plainContentText(NAME_LIMIT)
const short = plainContentText(SLUG_LIMIT)
const richText = z.string().max(TEXT_LIMIT)
const order = z.number().int().min(0).max(MAX_SORT_ORDER)
const slug = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const url = z.string().max(URL_LIMIT).refine(validUrl, 'Invalid HTTP(S) URL')
const optionalUrl = z.union([url, z.literal('')])
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(validDate, 'Invalid calendar date')
const timestamp = z.iso.datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)), 'Invalid timestamp')

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !/[\s<>]/.test(value)
  } catch { return false }
}

function validDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const postSchema = z.strictObject({
  slug: slug.max(POST_SLUG_LIMIT), type: z.enum(['blog', 'project']), title_ru: plain.min(1), title_en: plain,
  text_ru: richText, text_en: richText, excerpt_ru: plainContentText(TEXT_LIMIT), excerpt_en: plainContentText(TEXT_LIMIT),
  url: url.nullable(), published_at: timestamp.nullable(),
})
const aboutSchema = z.strictObject({ text_ru: richText, text_en: richText })
const settingsSchema = z.strictObject({
  open_to_work: z.boolean(), show_search: z.boolean(), github_url: optionalUrl, telegram_url: optionalUrl,
  email: z.union([z.email().max(EMAIL_LIMIT), z.literal('')]),
})
const experienceSchema = z.strictObject({
  company_ru: name.min(1), company_en: name, position_ru: name.min(1), position_en: name,
  date_from: date, date_to: date.nullable(), order,
})
const educationSchema = z.strictObject({
  institution: name.min(1), specialization_ru: name.min(1), specialization_en: name,
  date_from: date, date_to: date.nullable(), order,
})
const skillSchema = z.strictObject({ name: short.min(1), order })
const groupSchema = z.strictObject({ slug: slug.max(SLUG_LIMIT), name_ru: short.min(1), name_en: short, order })
const recordSchemas = { post: postSchema, about: aboutSchema, settings: settingsSchema, experience: experienceSchema, education: educationSchema, skill: skillSchema, 'skill-group': groupSchema }

/** Список берётся из того же allowlist, что и runtime-валидация. */
export function contentFieldNames(resource: Exclude<ContentResource, 'pages'>): string[] {
  return Object.keys(recordSchemas[resource].shape)
}

function validateDateOrder(data: Record<string, unknown>): boolean {
  return typeof data.date_from !== 'string' || typeof data.date_to !== 'string' || data.date_from <= data.date_to
}

function resourceSchema(resource: Exclude<ContentResource, 'pages'>): z.ZodObject<z.ZodRawShape> {
  return recordSchemas[resource]
}

/** Каждому ресурсу соответствует собственный строгий allowlist. */
export function contentRecordSchema(resource: ContentResource) {
  if (resource === 'pages') return pageCopySchema
  return resourceSchema(resource).refine(validateDateOrder, 'date_to precedes date_from')
}

/** Patch не меняет связи или служебные поля и не создаёт записи. */
export function contentPatchSchema(resource: ContentResource) {
  if (resource === 'pages') return pagePatchSchema
  return resourceSchema(resource).partial().refine(value => {
    const count = Object.keys(value).length
    return count > 0 && count <= MAX_PATCH_KEYS
  }, 'Empty or oversized patch')
}

export const contentSelectorSchema = z.strictObject({ resource: z.enum(CONTENT_RESOURCES), recordId: z.number().int().positive() })
export const contentPlanSchema = contentSelectorSchema.extend({ expectedVersion: z.string().regex(new RegExp(`^[a-f0-9]{${HASH_LENGTH}}$`)), patch: z.record(z.string(), z.unknown()) })
export const contentPlanIdSchema = z.strictObject({ planId: z.uuid() })
export const contentRestoreSchema = z.strictObject({ historyId: z.uuid(), expectedVersion: contentPlanSchema.shape.expectedVersion })
export const contentRevokeSchema = z.strictObject({ id: z.uuid() })
export const contentTokenSchema = z.strictObject({
  label: plainContentText(TOKEN_LABEL_LIMIT).trim().min(1),
  resources: z.array(z.enum(CONTENT_RESOURCES)).min(1).max(CONTENT_RESOURCES.length),
  scopes: z.array(z.enum(CONTENT_SCOPES)).min(1).max(CONTENT_SCOPES.length),
  expiresInDays: z.number().int().min(1).max(MAX_TOKEN_DAYS),
}).refine(value => new Set(value.resources).size === value.resources.length && new Set(value.scopes).size === value.scopes.length, 'Duplicate permissions')
