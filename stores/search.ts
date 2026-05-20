import { defineStore } from 'pinia'
import Fuse from 'fuse.js'
import type { Product } from '~/types'

export const useSearchStore = defineStore('search', () => {
  const isOpen = ref(false)
  const query = ref('')
  const results = ref<Product[]>([])
  const allItems = ref<Product[]>([])
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
      $fetch<Product[]>('/api/products/blog'),
      $fetch<Product[]>('/api/products/project'),
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
      keys: ['title', 'text_short', 'tags.name'],
      threshold: 0.4,
      includeScore: true,
    })
    results.value = fuse.search(q).map((r) => r.item)
  }

  return { isOpen, query, results, open, close, search }
})
