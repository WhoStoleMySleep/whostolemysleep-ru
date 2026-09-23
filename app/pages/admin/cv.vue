<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — CV' })

interface Change {
  id: string
  section: 'about' | 'experience' | 'education' | 'skills'
  kind: 'add' | 'update' | 'remove'
  label: string
  field?: string
  before: unknown
  after: unknown
  editable: boolean
}

const api     = useAdminApi()
const toast   = useAdminToast()
const confirm = useAdminConfirm()

/* ── Export ── */

const exporting = ref(false)

async function download() {
  exporting.value = true
  try {
    const snapshot = await api.get<unknown>('/api/admin/cv')
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `resume-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    exporting.value = false
  }
}

/* ── Import ── */

const raw      = ref('')
const fileName = ref('')
const comparing = ref(false)
const changes  = ref<Change[] | null>(null)

/** Accepted changes and edited values — each one is decided on separately. */
const accepted  = ref<Record<string, boolean>>({})
const overrides = ref<Record<string, string>>({})

function readFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  input.value = ''
  fileName.value = file.name

  const reader = new FileReader()
  reader.onload = () => { raw.value = String(reader.result ?? '') }
  reader.onerror = () => toast.err('Could not read the file')
  reader.readAsText(file)
}

async function compare() {
  let snapshot: unknown
  try {
    snapshot = JSON.parse(raw.value)
  } catch {
    toast.err('Not valid JSON')
    return
  }

  comparing.value = true
  try {
    const res = await api.post<{ changes: Change[] }>('/api/admin/cv/diff', { snapshot })
    changes.value = res.changes
    accepted.value  = {}
    overrides.value = {}
    // Nothing is pre-selected: an import must not apply anything silently.
    if (!res.changes.length) toast.ok('No differences — resume already matches the file')
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    comparing.value = false
  }
}

function reset() {
  changes.value = null
  raw.value = ''
  fileName.value = ''
}

const SECTIONS = ['about', 'experience', 'education', 'skills'] as const

const grouped = computed(() =>
  SECTIONS
    .map((section) => ({ section, list: (changes.value ?? []).filter((c) => c.section === section) }))
    .filter((g) => g.list.length),
)

const acceptedIds = computed(() => (changes.value ?? []).filter((c) => accepted.value[c.id]).map((c) => c.id))

function setAll(list: Change[], value: boolean) {
  for (const c of list) accepted.value[c.id] = value
}

const applying = ref(false)

async function apply() {
  const ids = acceptedIds.value
  if (!ids.length) return

  const removals = (changes.value ?? []).filter((c) => accepted.value[c.id] && c.kind === 'remove').length
  const ok = await confirm.ask({
    title:  `Apply ${ids.length} change(s)?`,
    text:   removals
      ? `${removals} record(s) will be deleted permanently. The rest will be updated or added.`
      : 'Selected changes will be written to the resume.',
    action: 'Apply',
    danger: removals > 0,
  })
  if (!ok) return

  applying.value = true
  try {
    const snapshot = JSON.parse(raw.value)
    const res = await api.post<{ applied: number }>('/api/admin/cv/apply', {
      snapshot,
      accept: ids,
      overrides: { ...overrides.value },
    })
    toast.ok(`Applied ${res.applied} change(s) — added to cache queue`)
    // Diff again: what is left shows what has not been applied yet.
    await compare()
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    applying.value = false
  }
}

/* ── Rendering values ── */

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : (v as { text_ru?: string }).text_ru ?? JSON.stringify(v)))
      .map((v) => `• ${v}`)
      .join('\n')
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const KIND_LABEL: Record<Change['kind'], string> = { add: 'new', update: 'changed', remove: 'delete' }
</script>

<template>
  <AdminPage title="CV" note="Export the resume as one file, edit it, and import it back">
    <template #actions>
      <button class="admin-btn admin-btn--ghost" type="button" :disabled="exporting" @click="download">
        {{ exporting ? 'Preparing…' : 'Download JSON' }}
      </button>
      <a class="admin-btn admin-btn--ghost" href="/ru/cv" target="_blank">Print CV · RU</a>
      <a class="admin-btn admin-btn--ghost" href="/en/cv" target="_blank">Print CV · EN</a>
    </template>

    <div v-if="!changes" class="admin-panel block">
      <p class="block__title">Import</p>
      <p class="hint">
        Upload the exported file after editing it, or paste its contents below.
        Nothing is written until you confirm each change.
      </p>

      <div class="row">
        <label class="admin-btn admin-btn--ghost file">
          <input type="file" accept="application/json,.json" @change="readFile">
          Choose file
        </label>
        <span v-if="fileName" class="hint">{{ fileName }}</span>
      </div>

      <textarea
        v-model="raw"
        class="admin-input json"
        rows="12"
        placeholder='{ "version": 2, "about": { … }, "experience": [ … ] }'
      />

      <div class="row">
        <button class="admin-btn admin-btn--primary" type="button" :disabled="!raw.trim() || comparing" @click="compare">
          {{ comparing ? 'Comparing…' : 'Compare with current resume' }}
        </button>
      </div>
    </div>

    <template v-else>
      <div class="admin-panel bar">
        <p class="bar__text">
          <strong>{{ changes.length }}</strong> difference(s) ·
          <strong>{{ acceptedIds.length }}</strong> selected
        </p>
        <div class="row">
          <button class="admin-btn admin-btn--ghost" type="button" @click="reset">Start over</button>
          <button
            class="admin-btn admin-btn--primary"
            type="button"
            :disabled="!acceptedIds.length || applying"
            @click="apply"
          >
            {{ applying ? 'Applying…' : `Apply ${acceptedIds.length}` }}
          </button>
        </div>
      </div>

      <p v-if="!changes.length" class="admin-empty">Resume already matches the file</p>

      <section v-for="group in grouped" :key="group.section" class="group">
        <div class="group__head">
          <p class="block__title">{{ group.section }} · {{ group.list.length }}</p>
          <div class="row">
            <button class="link-btn" type="button" @click="setAll(group.list, true)">Accept all</button>
            <button class="link-btn link-btn--muted" type="button" @click="setAll(group.list, false)">Skip all</button>
          </div>
        </div>

        <article
          v-for="change in group.list"
          :key="change.id"
          class="admin-panel change"
          :class="{ 'change--on': accepted[change.id], [`change--${change.kind}`]: true }"
        >
          <header class="change__head">
            <label class="change__pick">
              <input v-model="accepted[change.id]" type="checkbox">
              <span class="change__label">{{ change.label }}</span>
            </label>
            <span class="tag" :class="`tag--${change.kind}`">{{ KIND_LABEL[change.kind] }}</span>
          </header>

          <p v-if="change.field" class="change__field">{{ change.field }}</p>

          <div class="diff">
            <div class="diff__side">
              <p class="diff__cap">Now</p>
              <pre class="diff__val diff__val--before">{{ show(change.before) }}</pre>
            </div>
            <div class="diff__side">
              <p class="diff__cap">From file</p>
              <textarea
                v-if="change.editable"
                class="admin-input diff__edit"
                rows="3"
                :value="overrides[change.id] ?? String(change.after ?? '')"
                @input="overrides[change.id] = ($event.target as HTMLTextAreaElement).value"
              />
              <pre v-else class="diff__val diff__val--after">{{ show(change.after) }}</pre>
            </div>
          </div>
        </article>
      </section>
    </template>
  </AdminPage>
</template>

<style scoped>
.block { display: flex; flex-direction: column; gap: 14px; }

.block__title { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-4); }

.hint { font-size: 11.5px; line-height: 1.6; color: var(--text-4); }

.row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.file { cursor: pointer; }
.file input { display: none; }

.json {
  width: 100%;
  min-height: 220px;
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  resize: vertical;
}

.bar {
  position: sticky;
  top: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.bar__text { font-size: 11.5px; color: var(--text-3); }
.bar__text strong { color: var(--text); font-weight: 500; }

.group { margin-bottom: 24px; }

.group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.link-btn {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
}

.link-btn--muted { color: var(--text-4); }

.change {
  margin-bottom: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 2px solid var(--border);
  transition: border-color 0.15s, background 0.15s;
}

.change--on { border-left-color: var(--accent); }

.change__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.change__pick { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
.change__pick input { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; flex-shrink: 0; }

.change__label { font-size: 13px; color: var(--text); overflow: hidden; text-overflow: ellipsis; }

.change__field { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-4); }

.tag {
  flex-shrink: 0;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: var(--r-pill);
  border: 1px solid var(--border-s);
  background: var(--soft);
  color: var(--text-4);
}

.tag--add    { color: var(--green); }
.tag--remove { color: var(--red); }
.tag--update { color: var(--blue); }

.diff { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

@media (max-width: 720px) {
  .diff { grid-template-columns: 1fr; }
}

.diff__side { min-width: 0; display: flex; flex-direction: column; gap: 5px; }

.diff__cap { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-4); }

.diff__val {
  margin: 0;
  padding: 9px 11px;
  max-height: 220px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
}

.diff__val--before { color: var(--text-4); }
.diff__val--after  { color: var(--text-2); }

.diff__edit {
  min-height: 62px;
  padding: 9px 11px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-2);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  resize: vertical;
}
</style>
