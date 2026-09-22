import { db } from '~~/server/db'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: posts'],
    summary:     'Post list for the admin table',
    description: 'Table columns only: texts and relations are not loaded here, the whole post comes from GET /api/admin/posts/{id}.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'Posts, most recently changed first', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdminPostRow' } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          AdminPostRow: {
            type: 'object',
            properties: {
              id:           { type: 'integer' },
              slug:         { type: 'string' },
              title_ru:     { type: 'string' },
              title_en:     { type: 'string' },
              type:         { type: 'string', enum: ['blog', 'project'] },
              is_published: { type: 'boolean' },
              updated_at:   { type: 'string', format: 'date-time' },
            },
          },
          AdminPost: {
            type: 'object',
            properties: {
              id:           { type: 'integer' },
              slug:         { type: 'string' },
              external_id:  { type: 'string', nullable: true },
              type:         { type: 'string', enum: ['blog', 'project'] },
              title_ru:     { type: 'string' },
              title_en:     { type: 'string' },
              text_ru:      { type: 'string' },
              text_en:      { type: 'string' },
              excerpt_ru:   { type: 'string' },
              excerpt_en:   { type: 'string' },
              url:          { type: 'string', nullable: true },
              is_published: { type: 'boolean' },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              created_at:   { type: 'string', format: 'date-time' },
              updated_at:   { type: 'string', format: 'date-time' },
              postTags:     { type: 'array', items: { type: 'object', properties: { tag: { $ref: '#/components/schemas/TagRow' } } } },
              images:       { type: 'array', items: { $ref: '#/components/schemas/ImageRow' } },
            },
          },
          ImageRow: {
            type: 'object',
            properties: {
              id:       { type: 'integer' },
              post_id:  { type: 'integer' },
              url:      { type: 'string', format: 'uri' },
              alt_ru:   { type: 'string' },
              alt_en:   { type: 'string' },
              position: { type: 'integer' },
            },
          },
          PostInput: {
            type: 'object',
            properties: {
              slug:         { type: 'string' },
              type:         { type: 'string', enum: ['blog', 'project'] },
              title_ru:     { type: 'string' },
              title_en:     { type: 'string' },
              text_ru:      { type: 'string', description: 'HTML, passed through sanitizeHtml' },
              text_en:      { type: 'string', description: 'HTML, passed through sanitizeHtml' },
              excerpt_ru:   { type: 'string' },
              excerpt_en:   { type: 'string' },
              url:          { type: 'string', nullable: true },
              is_published: { type: 'boolean' },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              tag_ids:      { type: 'array', items: { type: 'integer' }, description: 'Replaces the whole set of tags' },
            },
          },
        },
      },
    },
  },
})

/**
 * The list behind the admin table. The columns are named one by one on purpose:
 * the query used to pull text_ru/text_en along with tags and images — the entire
 * post table, in other words — while the table shows five fields.
 * The whole post is served by /api/admin/posts/[id].
 */
export default defineEventHandler(async () => {
  return db.query.post.findMany({
    columns: {
      id:           true,
      slug:         true,
      title_ru:     true,
      title_en:     true,
      type:         true,
      is_published: true,
      updated_at:   true,
    },
    orderBy: (p, { desc }) => [desc(p.updated_at)],
  })
})
