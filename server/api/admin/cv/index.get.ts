import { buildSnapshot } from '~~/server/utils/cv'

/** Выгрузка резюме одним файлом — он же шаблон для обратной загрузки. */
export default defineEventHandler(async () => buildSnapshot())
