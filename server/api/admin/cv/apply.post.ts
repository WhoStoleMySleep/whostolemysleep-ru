import { applyChanges, diffSnapshot, parseSnapshot } from '~~/server/utils/cv'
import { markDirty, resumePaths } from '~~/server/utils/pending'

interface Body {
  snapshot:  unknown
  /** Ids of the changes the user accepted. */
  accept:    string[]
  /** Values edited in the list itself: change id to its new "after". */
  overrides?: Record<string, string>
}

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'Apply the accepted changes',
    description: 'The diff is recomputed on the server; the client sends only the ids of the accepted changes.',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['snapshot', 'accept'],
            properties: {
              snapshot:  { $ref: '#/components/schemas/CvSnapshot' },
              accept:    { type: 'array', items: { type: 'string' }, description: 'Change ids from the diff response' },
              overrides: { type: 'object', additionalProperties: { type: 'string' }, description: 'Change id to a new value; works only for editable changes' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'How many changes were applied and how many were dropped', content: { 'application/json': { schema: { type: 'object', properties: { applied: { type: 'integer' }, skipped: { type: 'integer' } } } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * The diff is recomputed on the server and the client sends only the ids of the
 * accepted changes. Otherwise the request body would dictate the write directly —
 * any field of any table.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  const accept = new Set(Array.isArray(body?.accept) ? body.accept : [])
  if (!accept.size) return { applied: 0 }

  const input  = parseSnapshot(body?.snapshot)
  const bound  = await diffSnapshot(input)
  const chosen = bound.filter((b) => accept.has(b.change.id))

  for (const b of chosen) {
    const override = body.overrides?.[b.change.id]
    // Only scalar fields are editable — lists are applied as they are.
    if (override !== undefined && b.change.editable) b.change.after = override
  }

  await applyChanges(chosen)
  await markDirty(resumePaths())

  return { applied: chosen.length, skipped: accept.size - chosen.length }
})
