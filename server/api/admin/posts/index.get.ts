import { db } from '~~/server/db'

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
