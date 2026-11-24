import type { PostSummary } from '~/types'

/** Проекты открываются как кейсы; внешний адрес остаётся действием внутри страницы. */
export const usePostLink = () => {
  const localePath = useLocalePath()

  function linkFor(post: PostSummary) {
    if (post.type === 'project') return { href: localePath(`/projects/${post.slug}`), isExternal: false }
    return post.url
      ? { href: post.url, isExternal: true }
      : { href: localePath(`/blog/${post.slug}`), isExternal: false }
  }

  return { linkFor }
}
