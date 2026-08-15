import { defineStore } from 'pinia'
import type FuseType from 'fuse.js'
import type { Post } from '~/types'

const FUSE_OPTIONS = {
  keys:         ['title', 'excerpt', 'tags.name'],
  threshold:    0.4,
  includeScore: true,
}

export const useSearchStore = defineStore('search', () => {
  const isOpen   = ref(false)
  const query    = ref('')
  const results  = ref<Post[]>([])
  const allItems = ref<Post[]>([])
  const isLoaded = ref(false)

  /** Индекс строится один раз на набор записей, а не на каждое нажатие. */
  let index: FuseType<Post> | null = null

  const { locale } = useLocale()

  watch(locale, () => {
    isLoaded.value = false
    allItems.value = []
    index = null
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

  async function loadItems() {
    const [blog, projects] = await Promise.all([
      $fetch<Post[]>('/api/posts/blog',    { query: { locale: locale.value } }),
      $fetch<Post[]>('/api/posts/project', { query: { locale: locale.value } }),
    ])
    allItems.value = [...(blog ?? []), ...(projects ?? [])]
    index = null
    isLoaded.value = true
  }

  /**
   * fuse.js подгружается динамически. При статическом импорте он попадал
   * во входной чанк и весил ~34 КБ на каждой странице сайта — даже там,
   * где поиск отключён настройкой и не может быть открыт.
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
    // Пока грузился индекс, пользователь мог дописать запрос — тогда
    // этот результат уже неактуален и перетирать им свежий нельзя.
    if (query.value !== q) return

    results.value = idx.search(q).map((r) => r.item)
  }

  return { isOpen, query, results, open, close, search }
})
