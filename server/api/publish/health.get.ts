defineRouteMeta({
  openAPI: {
    tags:    ['Publisher'],
    summary: 'Health check',
    responses: {
      200: { description: 'The server is up; publishing tells whether PUBLISH_TOKEN is set', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] }, publishing: { type: 'boolean' } } } } } },
    },
  },
})

/**
 * Health check for the external publisher. No token is required here: the answer
 * reveals nothing, and the "Check connection" button has to work before the token
 * has been entered.
 */
export default defineEventHandler(() => ({
  status:    'ok',
  publishing: Boolean(process.env.PUBLISH_TOKEN),
}))
