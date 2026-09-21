import { db } from '~~/server/db'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: посты'],
    summary:     'Список постов для таблицы',
    description: 'Только колонки таблицы: тексты и связи сюда не тянутся, полный пост отдаёт GET /api/admin/posts/{id}.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'Посты от недавно изменённых к старым', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdminPostRow' } } } } },
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
              text_ru:      { type: 'string', description: 'HTML, прогоняется через sanitizeHtml' },
              text_en:      { type: 'string', description: 'HTML, прогоняется через sanitizeHtml' },
              excerpt_ru:   { type: 'string' },
              excerpt_en:   { type: 'string' },
              url:          { type: 'string', nullable: true },
              is_published: { type: 'boolean' },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              tag_ids:      { type: 'array', items: { type: 'integer' }, description: 'Заменяет набор тегов целиком' },
            },
          },
        },
      },
    },
  },
})

/**
 * Список для таблицы в админке. Колонки перечислены поимённо намеренно:
 * раньше запрос тянул text_ru/text_en вместе с тегами и картинками —
 * то есть всю базу постов целиком, — а таблица показывает пять полей.
 * Полный пост отдаёт /api/admin/posts/[id].
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
