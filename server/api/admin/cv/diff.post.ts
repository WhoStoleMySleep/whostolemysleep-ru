import { diffSnapshot, parseSnapshot } from '~~/server/utils/cv'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: резюме'],
    summary:     'Что изменится при загрузке файла',
    description: 'Ничего не пишет: список уходит в интерфейс, где каждое изменение подтверждается отдельно.',
    security:    [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['snapshot'], properties: { snapshot: { $ref: '#/components/schemas/CvSnapshot' } } } } } },
    responses: {
      200: { description: 'Список изменений', content: { 'application/json': { schema: { type: 'object', properties: { changes: { type: 'array', items: { $ref: '#/components/schemas/CvChange' } } } } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * Что изменится, если применить загруженный файл. Ничего не пишет:
 * список уходит в интерфейс, где каждое изменение подтверждается отдельно.
 */
export default defineEventHandler(async (event) => {
  const body  = await readBody<{ snapshot?: unknown }>(event)
  const input = parseSnapshot(body?.snapshot)
  const bound = await diffSnapshot(input)
  return { changes: bound.map((b) => b.change) }
})
