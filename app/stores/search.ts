import type FuseType from 'fuse.js'
import type { PostSummary } from '~/types'

const FUSE_OPTIONS = {
  keys:         ['title', 'excerpt', 'tags.name'],
  threshold:    0.4,
  includeScore: true,
}

export const useSearchStore = defineStore('search', () => {
  const isOpen   = ref(false)
  const query    = ref('')
  const results  = ref<PostSummary[]>([])
  const allItems = ref<PostSummary[]>([])
  const isLoaded = ref(false)

  /** The index is built once per set of entries, not on every keystroke. */
  let index: FuseType<PostSummary> | null = null
  /** The request in flight: opening twice in a row must not load twice. */
  let loading: Promise<void> | null = null

  const { locale } = useLocale()

  watch(locale, () => {
    isLoaded.value = false
    allItems.value = []
    index   = null
    loading = null
    if (isOpen.value) loadItems()
  })

  async function open() {
    isOpen.value = true
    if (!isLoaded.value) await loadItems()
  }

  function close() {
    isOpen.value = false
    query.value  = ''
    results.value = []
  }

  function loadItems(): Promise<void> {
    if (!loading) {
      const request = fetchItems().finally(() => { if (loading === request) loading = null })
      loading = request
    }
    return loading
  }

  /**
   * A failure is logged and left unloaded, so the next opening tries again. A
   * response for a language that is no longer selected is dropped: it would fill
   * the index with the wrong translations.
   */
  async function fetchItems() {
    const requested = locale.value
    try {
      const [blog, projects] = await Promise.all([
        $fetch<PostSummary[]>('/api/posts/blog',    { query: { locale: requested } }),
        $fetch<PostSummary[]>('/api/posts/project', { query: { locale: requested } }),
      ])
      if (requested !== locale.value) return
      allItems.value = [...(blog ?? []), ...(projects ?? [])]
      index = null
      isLoaded.value = true
    } catch (e) {
      console.error('[search] failed to load entries', e)
    }
  }

  /**
   * fuse.js is imported dynamically. As a static import it landed in the entry
   * chunk and cost ~34 KB on every page of the site — including the pages where
   * search is disabled by a setting and cannot be opened at all.
   */
  async function ensureIndex() {
    if (index) return index
    const { default: Fuse } = await import('fuse.js')
    index = new Fuse(allItems.value, FUSE_OPTIONS)
    return index
  }

  async function search(q: string) {
    query.value = q
    if (!q.trim()) {
      results.value = []
      return
    }

    const idx = await ensureIndex()
    // While the index was loading the query may have been typed further — this
    // result is stale by now and must not overwrite a fresher one.
    if (query.value !== q) return

    results.value = idx.search(q).map((r) => r.item)
  }

  return { isOpen, query, results, open, close, search }
})
