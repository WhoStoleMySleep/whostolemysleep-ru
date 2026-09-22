defineRouteMeta({
  openAPI: {
    tags:        ['Admin: session'],
    summary:     'Check the session',
    description: 'Answers only while the cookie is alive: getting an answer at all is the check.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'The session is valid', content: { 'application/json': { schema: { type: 'object', properties: { admin: { type: 'boolean' } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(() => ({ admin: true }))
