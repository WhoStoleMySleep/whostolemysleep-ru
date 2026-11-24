import type { z } from 'zod'
import type { H3Event } from 'h3'
import type { ContentEnvironment } from '~~/shared/content/types'
import { SITE_URL } from '~~/shared/utils/site'

const CONTENT_BODY_KIB = 128
export const CONTENT_BODY_LIMIT = CONTENT_BODY_KIB * 1024
const WRITE_DISABLED = 503

/** Даже preview с общей БД не пишет без явного серверного переключателя. */
export function requireContentWrites(): ContentEnvironment {
  if (process.env.CONTENT_WRITE_ENABLED !== 'true') throw createError({ statusCode: WRITE_DISABLED, message: 'Content writes are disabled' })
  return contentEnvironment()
}

/** Host и клиентский payload не участвуют в выборе среды. */
export function contentEnvironment(): ContentEnvironment {
  const environment = process.env.CONTENT_ENVIRONMENT
  if (environment === 'development' || environment === 'preview' || environment === 'production') return environment
  throw createError({ statusCode: WRITE_DISABLED, message: 'CONTENT_ENVIRONMENT must be explicitly configured' })
}

/** Не раскрывает payload и внутренности схем в HTTP-ошибках. */
export function parseContentInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid content input', data: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) })
  return parsed.data
}

function previewAdminOrigin(): string {
  try {
    const configured = process.env.CONTENT_ADMIN_ORIGIN ?? ''
    const url = new URL(configured)
    if (url.protocol === 'https:' && url.origin === configured) return url.origin
  } catch { throw createError({ statusCode: WRITE_DISABLED, message: 'Valid CONTENT_ADMIN_ORIGIN required for preview writes' }) }
  throw createError({ statusCode: WRITE_DISABLED, message: 'Valid CONTENT_ADMIN_ORIGIN required for preview writes' })
}

function contentAdminOrigin(event: H3Event): string {
  const environment = contentEnvironment()
  if (environment === 'production') return new URL(SITE_URL).origin
  if (environment === 'preview') return previewAdminOrigin()
  const url = getRequestURL(event, { xForwardedHost: false, xForwardedProto: false })
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw createError({ statusCode: 403, message: 'Development content admin requires loopback host' })
  return url.origin
}

/** За TLS proxy проверяется доверенный origin, а не подделываемый Host/forwarded header. */
export function requireContentOrigin(event: H3Event): void {
  const origin = getRequestHeader(event, 'origin')
  const expected = contentAdminOrigin(event)
  if (origin !== expected || getRequestHeader(event, 'sec-fetch-site') === 'cross-site') {
    throw createError({ statusCode: 403, message: 'Same-origin request required' })
  }
}

/** Ограничивает поток, а не только подделываемый Content-Length. */
export async function readContentBody(event: H3Event): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(getRequestHeader(event, 'content-type') ?? '')) throw createError({ statusCode: 415, message: 'JSON body required' })
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > CONTENT_BODY_LIMIT) throw createError({ statusCode: 413, message: 'Content body too large' })
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of event.node.req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > CONTENT_BODY_LIMIT) throw createError({ statusCode: 413, message: 'Content body too large' })
    chunks.push(bytes)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw createError({ statusCode: 400, message: 'Invalid JSON body' }) }
}
