import { defineStore } from 'pinia'
import Fuse from 'fuse.js'
import type { Post } from '~/types'

export const useSearchStore = defineStore('search', () => {
  const isOpen = ref(false)
  const query = ref('')
  const results = ref<Post[]>([])
  const allItems = ref<Post[]>([])
  const isLoaded = ref(false)

  async function open() {
    isOpen.value = true
    if (!isLoaded.value) await loadItems()
  }

  function close() {
    isOpen.value = false
    query.value = ''
    results.value = []
  }

  async function loadItems() {
    const [blog, projects] = await Promise.all([
      $fetch<Post[]>('/api/posts/blog'),
      $fetch<Post[]>('/api/posts/project'),
    ])
    allItems.value = [...(blog ?? []), ...(projects ?? [])]
    isLoaded.value = true
  }

  function search(q: string) {
    query.value = q
    if (!q.trim()) {
      results.value = []
      return
    }
    const fuse = new Fuse(allItems.value, {
      keys: ['title', 'excerpt', 'tags.name'],
      threshold: 0.4,
      includeScore: true,
    })
    results.value = fuse.search(q).map((r) => r.item)
  }

  return { isOpen, query, results, open, close, search }
})
