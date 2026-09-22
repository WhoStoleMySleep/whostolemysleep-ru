import type { Post } from '~/types'

/**
 * Where an entry points: an external project to its own url, everything else to
 * the blog page. Used by the home page and by UiCard.
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
