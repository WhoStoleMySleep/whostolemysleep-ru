import type { Post } from '~/types'

/**
 * Куда ведёт запись: внешние проекты — на свой url, остальное —
 * на страницу блога. Используется главной и UiCard.
 */
export const usePostLink = () => {
  const localePath = useLocalePath()

  function linkFor(post: Post) {
    return post.url
      ? { href: post.url, isExternal: true }
      : { href: localePath(`/blog/${post.slug}`), isExternal: false }
  }

  return { linkFor }
}
