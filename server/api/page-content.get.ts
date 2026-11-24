import { readPublicPageContent } from '~~/server/utils/contentRecords'
import { contentEnvironment } from '~~/server/utils/contentInput'

export default defineEventHandler(() => {
  if (!process.env.CONTENT_ENVIRONMENT) return { ru: {}, en: {} }
  return readPublicPageContent(contentEnvironment())
})
