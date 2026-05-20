<script setup lang="ts">
const search = useSearchStore()
const input  = ref<HTMLInputElement | null>(null)
const route  = useRoute()
const { t }  = useLocale()

watch(() => search.isOpen, (val) => {
  if (val) {
    nextTick(() => input.value?.focus())
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

watch(() => route.path, () => search.close())

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') search.close()
}

const { formatLong } = useFormatDate()
</script>

<template>
  <Teleport to="body">
    <Transition name="search-overlay">
      <div v-if="search.isOpen" class="search-overlay" @keydown="onKey" @click.self="search.close()">
        <div class="search-panel">
          <div class="search-header">
            <div class="search-input-wrap">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input
                ref="input"
                class="search-input"
                :value="search.query"
                @input="search.search(($event.target as HTMLInputElement).value)"
                :placeholder="t('search.placeholder')"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            <button class="search-close" @click="search.close()" aria-label="Close">
              <kbd>esc</kbd>
            </button>
          </div>

          <div class="search-body">
            <div v-if="search.query && search.results.length === 0" class="search-empty">
              {{ t('search.empty').replace('{q}', search.query) }}
            </div>

            <ul v-else-if="search.results.length > 0" class="search-results">
              <li v-for="item in search.results" :key="item.id" class="search-result">
                <NuxtLink
                  :to="item.url ?? `/blog/${item.slug}`"
                  :target="item.url ? '_blank' : ''"
                  class="search-result__link"
                  @click="search.close()"
                >
                  <span class="search-result__type">{{ item.type === 'blog' ? t('card.blog') : t('card.project') }}</span>
                  <span class="search-result__title">{{ item.title }}</span>
                  <span v-if="item.published_at" class="search-result__date">{{ formatLong(item.published_at) }}</span>
                </NuxtLink>
              </li>
            </ul>

            <p v-else class="search-hint">{{ t('search.hint') }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay-bg);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 15vh 24px 24px;
}

.search-panel {
  width: 100%;
  max-width: 640px;
  background: var(--bg-2);
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
  gap: 12px;
}

.search-icon { color: var(--text-3); flex-shrink: 0; }

.search-input-wrap { flex: 1; display: flex; align-items: center; gap: 12px; }

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 20px 0;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text);
  outline: none;
}

.search-input::placeholder { color: var(--text-3); }

.search-close {
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 10px;
  letter-spacing: 0.05em;
}

.search-close kbd {
  font-family: var(--font-mono);
  padding: 3px 7px;
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  transition: color 0.2s, border-color 0.2s;
}

.search-close:hover kbd { color: var(--accent); border-color: var(--accent); }

.search-body { max-height: 400px; overflow-y: auto; }

.search-hint,
.search-empty {
  padding: 40px 20px;
  font-size: 13px;
  color: var(--text-3);
  text-align: center;
}

.search-results { padding: 8px 0; }

.search-result__link {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  transition: background 0.15s;
}

.search-result__link:hover { background: var(--bg-3); }

.search-result__type {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 500;
}

.search-result__title {
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result__date { font-size: 11px; color: var(--text-3); white-space: nowrap; }

.search-overlay-enter-active,
.search-overlay-leave-active { transition: opacity 0.2s ease; }
.search-overlay-enter-active .search-panel,
.search-overlay-leave-active .search-panel { transition: transform 0.25s var(--ease-out), opacity 0.2s ease; }
.search-overlay-enter-from,
.search-overlay-leave-to { opacity: 0; }
.search-overlay-enter-from .search-panel,
.search-overlay-leave-to .search-panel { transform: translateY(-20px); opacity: 0; }
</style>
