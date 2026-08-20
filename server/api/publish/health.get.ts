/**
 * Проверка связи для внешнего публикатора. Токен здесь не спрашиваем:
 * ответ ничего не раскрывает, а кнопка «Проверить связь» должна работать
 * и когда токен ещё не введён.
 */
export default defineEventHandler(() => ({
  status:    'ok',
  publishing: Boolean(process.env.PUBLISH_TOKEN),
}))
