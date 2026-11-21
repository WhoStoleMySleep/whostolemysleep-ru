<script setup lang="ts">
interface Tag { id: number; slug: string; name_ru: string; name_en: string }

const props = defineProps<{ disabled?: boolean }>()
const model = defineModel<number[]>({ default: () => [] })
const busy = defineModel<boolean>('busy', { default: false })
const api = useAdminApi()
const { data: tags, error: loadError, refresh } = await useAsyncData<Tag[]>(
  'admin-tags', () => api.get<Tag[]>('/api/admin/tags'), { default: () => [] },
)

const query = ref('')
const open = ref(false)
const error = ref('')
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const options = ref<HTMLElement | null>(null)
const listId = useId()
const selectedIds = computed(() => new Set(model.value))
const selected = computed(() => (tags.value ?? []).filter(tag => selectedIds.value.has(tag.id)))
const normalized = computed(() => query.value.trim().toLocaleLowerCase('ru'))
const matches = computed(() => (tags.value ?? []).filter(tag =>
  !selectedIds.value.has(tag.id) && `${tag.name_ru} ${tag.name_en}`.toLocaleLowerCase('ru').includes(normalized.value),
))
const exact = computed(() => (tags.value ?? []).find(tag =>
  [tag.name_ru, tag.name_en].some(name => name.toLocaleLowerCase('ru') === normalized.value),
))

function choose(tag: Tag) {
  if (props.disabled || busy.value) return
  model.value = [...new Set([...model.value, tag.id])]
  query.value = ''
  open.value = false
  error.value = ''
  input.value?.focus()
  open.value = false
}

function remove(id: number) {
  if (props.disabled || busy.value) return
  model.value = model.value.filter(value => value !== id)
}

async function submit() {
  if (props.disabled || busy.value || !normalized.value) return
  if (exact.value) { choose(exact.value); return }
  const name = query.value.trim()
  busy.value = true
  error.value = ''
  try {
    const tag = await api.post<Tag>('/api/admin/tags', { name_ru: name })
    tags.value = [...new Map([...(tags.value ?? []), tag].map(item => [item.id, item])).values()]
    model.value = [...new Set([...model.value, tag.id])]
    query.value = ''
    open.value = false
  } catch (e) {
    error.value = adminError(e)
    await refresh()
  } finally {
    busy.value = false
  }
}

function onBlur(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { open.value = false; input.value?.focus(); open.value = false; return }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  open.value = true
  void nextTick(() => {
    const buttons = Array.from(options.value?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    const next = index + (event.key === 'ArrowDown' ? 1 : -1)
    if (next < 0) input.value?.focus()
    else buttons[Math.min(next, buttons.length - 1)]?.focus()
  })
}
</script>

<template>
  <div ref="root" class="tag-picker" @focusout="onBlur" @keydown="onKey">
    <div class="tag-picker__field">
      <button
        v-for="tag in selected" :key="tag.id" class="chip chip--active" type="button"
        :disabled="disabled || busy" :aria-label="`Remove tag ${tag.name_ru}`" @click="remove(tag.id)"
      >{{ tag.name_ru }} <span aria-hidden="true">×</span></button>
      <input
        ref="input" v-model="query" class="tag-picker__input" type="text" maxlength="100"
        role="combobox" aria-autocomplete="list" aria-label="Search or create a tag" :aria-controls="listId" :aria-expanded="open"
        :disabled="disabled || busy" :placeholder="busy ? 'Creating…' : 'Search or create a tag…'"
        autocomplete="off" @focus="open = true" @input="open = true; error = ''" @keydown.enter.prevent="submit"
      >
    </div>
    <div v-if="open && !disabled && !busy" :id="listId" ref="options" class="tag-picker__options" role="listbox" aria-label="Tags">
      <button v-for="tag in matches" :key="tag.id" class="tag-picker__option" type="button" role="option" aria-selected="false" @click="choose(tag)">
        {{ tag.name_ru }} <span v-if="tag.name_en && tag.name_en !== tag.name_ru">{{ tag.name_en }}</span>
      </button>
      <button v-if="normalized && !exact" class="tag-picker__option tag-picker__create" type="button" role="option" aria-selected="false" @click="submit">
        + Create “{{ query.trim() }}”
      </button>
      <p v-if="!matches.length && (!normalized || exact)" class="tag-picker__empty">{{ exact ? 'Already selected' : 'Type a name to create a tag' }}</p>
    </div>
    <p v-if="error || loadError" class="tag-picker__error" role="alert">{{ error || 'Could not load tags' }}</p>
  </div>
</template>

<style scoped>
.tag-picker { position: relative; }
.tag-picker__field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  background: var(--bg);
}
.tag-picker__field:focus-within { border-color: var(--accent); }
.tag-picker__input {
  flex: 1 1 180px;
  min-width: 0;
  padding: 4px;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  border: 1px solid var(--accent);
  border-radius: var(--r-pill);
  background: var(--accent-dim);
  color: var(--accent);
  font: inherit;
  font-size: 11px;
}
.tag-picker__options {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  background: var(--bg-1);
  box-shadow: 0 8px 24px var(--overlay-bg);
}
.tag-picker__option {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: var(--r-s);
  background: transparent;
  color: var(--text);
  text-align: left;
  font: inherit;
  font-size: 12px;
}
.tag-picker__option:hover, .tag-picker__option:focus-visible { background: var(--accent-dim); }
.tag-picker__option span { color: var(--text-4); }
.tag-picker__create { color: var(--accent); }
.tag-picker__empty { padding: 10px; font-size: 11px; color: var(--text-4); }
.tag-picker__error { margin-top: 8px; font-size: 11px; color: var(--accent); }
</style>
