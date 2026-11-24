import { z } from 'zod'
import type { H3Event } from 'h3'
import { CONTENT_RESOURCES, contentSelectorSchema } from '~~/shared/content/schemas'
import type { ContentActor } from './contentAuth'
import { requireContentAdmin, requireContentBearer, contentQuota } from './contentAuth'
import { parseContentInput, readContentBody, requireContentWrites } from './contentInput'

/** Квоты и actor вычисляются одинаково у cookie и Bearer endpoints. */
export async function contentRequestActor(event: H3Event, options: { admin: boolean; action: 'read' | 'plan' | 'apply' | 'control' }): Promise<ContentActor> {
  const mutation = options.action !== 'read'
  if (mutation) requireContentWrites()
  const actor = options.admin ? await requireContentAdmin(event, mutation) : await requireContentBearer(event)
  await contentQuota(actor, options.action)
  return actor
}

/** Query records принимает только resource, а не имена таблиц или SQL. */
export function contentResourceQuery(event: H3Event) {
  return parseContentInput(z.strictObject({ resource: z.enum(CONTENT_RESOURCES) }), getQuery(event)).resource
}

/** Query coercion ограничен каноническим положительным целым, без parseInt suffix. */
export function contentSnapshotQuery(event: H3Event) {
  const raw = parseContentInput(z.strictObject({ resource: z.enum(CONTENT_RESOURCES), recordId: z.string().regex(/^[1-9]\d*$/) }), getQuery(event))
  return parseContentInput(contentSelectorSchema, { ...raw, recordId: Number(raw.recordId) })
}

/** Единственный путь JSON input для новых mutation endpoints. */
export async function contentRequestBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
  return parseContentInput(schema, await readContentBody(event))
}
