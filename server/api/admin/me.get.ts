defineRouteMeta({
  openAPI: {
    tags:        ['Админка: сессия'],
    summary:     'Проверить сессию',
    description: 'Отвечает только при живой куке: сам факт ответа и есть проверка.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'Сессия действительна', content: { 'application/json': { schema: { type: 'object', properties: { admin: { type: 'boolean' } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(() => ({ admin: true }))
