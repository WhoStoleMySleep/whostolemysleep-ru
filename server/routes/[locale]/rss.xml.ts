import { buildFeed, isFeedLocale } from '~~/server/utils/feed'

defineRouteMeta({
  openAPI: {
    tags:    ['Service'],
    summary: 'Blog feed, RSS 2.0',
    parameters: [
      { name: 'locale', in: 'path', required: true, schema: { type: 'string', enum: ['en', 'ru'] } },
    ],
    responses: {
      200: { description: 'The latest blog posts in the requested locale', content: { 'application/rss+xml': { schema: { type: 'string' } } } },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

/**
 * One handler for both feeds. The locale is a path segment rather than a query
 * parameter because a feed url is pasted into a reader by hand and never carries
 * one; anything that is not a locale this site has is a 404, not a default.
 */
export default defineCachedEventHandler(async (event) => {
  const locale = getRouterParam(event, 'locale')
  if (!isFeedLocale(locale)) throw createError({ statusCode: 404, message: 'No such feed' })

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return buildFeed(locale)
}, {
  maxAge: 600,
  getKey: event => `rss-${getRouterParam(event, 'locale')}`,
})
