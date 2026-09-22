import { diffSnapshot, parseSnapshot } from '~~/server/utils/cv'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'What the uploaded file would change',
    description: 'Writes nothing: the list goes to the UI, where every change is accepted separately.',
    security:    [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['snapshot'], properties: { snapshot: { $ref: '#/components/schemas/CvSnapshot' } } } } } },
    responses: {
      200: { description: 'The list of changes', content: { 'application/json': { schema: { type: 'object', properties: { changes: { type: 'array', items: { $ref: '#/components/schemas/CvChange' } } } } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * What the uploaded file would change. Writes nothing: the list goes to the UI,
 * where every change is accepted one by one.
 */
export default defineEventHandler(async (event) => {
  const body  = await readBody<{ snapshot?: unknown }>(event)
  const input = parseSnapshot(body?.snapshot)
  const bound = await diffSnapshot(input)
  return { changes: bound.map((b) => b.change) }
})
