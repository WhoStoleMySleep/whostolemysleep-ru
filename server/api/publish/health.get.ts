defineRouteMeta({
  openAPI: {
    tags:    ['Публикатор'],
    summary: 'Проверка связи',
    responses: {
      200: { description: 'Сервер жив; publishing показывает, задан ли PUBLISH_TOKEN', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] }, publishing: { type: 'boolean' } } } } } },
    },
  },
})

/**
 * Проверка связи для внешнего публикатора. Токен здесь не спрашиваем:
 * ответ ничего не раскрывает, а кнопка «Проверить связь» должна работать
 * и когда токен ещё не введён.
 */
export default defineEventHandler(() => ({
  status:    'ok',
  publishing: Boolean(process.env.PUBLISH_TOKEN),
}))
