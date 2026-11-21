import type { InferSelectModel } from 'drizzle-orm'
import type { Locale, Post, PostSummary } from '~/types'
import type { image, post, tag } from '../db/schema'
import { pick } from './locale'

type SummaryRow = Omit<InferSelectModel<typeof post>, 'text_ru' | 'text_en'> & {
  postTags: { tag: InferSelectModel<typeof tag> }[]
  images:   InferSelectModel<typeof image>[]
}

type PostRow = SummaryRow & Pick<InferSelectModel<typeof post>, 'text_ru' | 'text_en'>

function toPostTag({ tag }: SummaryRow['postTags'][number], locale: Locale) {
  return { id: tag.id, slug: tag.slug, name: pick(tag.name_ru, tag.name_en, locale) }
}

function toPostImage(image: SummaryRow['images'][number], locale: Locale) {
  return {
    id: image.id,
    url: image.url,
    alt: pick(image.alt_ru, image.alt_en, locale),
    position: image.position,
  }
}

/**
 * A post as lists show it — without the body. Lists used to carry the full html of
 * every post, and through the Nuxt payload it was inlined into every page that
 * rendered a list, the home page included.
 */
export function toPostSummary(row: SummaryRow, locale: Locale): PostSummary {
  return {
    id:           row.id,
    slug:         row.slug,
    type:         row.type,
    title:        pick(row.title_ru, row.title_en, locale),
    excerpt:      pick(row.excerpt_ru, row.excerpt_en, locale),
    url:          row.url,
    is_pinned:    row.is_pinned,
    published_at: row.published_at,
    updated_at:   row.updated_at,
    tags:         row.postTags.map(tag => toPostTag(tag, locale)),
    images:       row.images.map(image => toPostImage(image, locale)),
  }
}

/** The full post for its own page. */
export function toPost(row: PostRow, locale: Locale): Post {
  return { ...toPostSummary(row, locale), text: pick(row.text_ru, row.text_en, locale) }
}
