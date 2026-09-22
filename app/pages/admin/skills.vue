<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Skills' })

interface Skill { id: number; group_id: number; name: string; order: number }
interface Group { id: number; slug: string; name_ru: string; name_en: string; order: number; skills: Skill[] }

const api     = useAdminApi()
const toast   = useAdminToast()
const confirm = useAdminConfirm()

const { data, refresh } = await useAsyncData<Group[]>(
  'admin-skills', () => api.get<Group[]>('/api/admin/skills'), { default: () => [] },
)
const groups = computed(() => data.value ?? [])

/* ── Group ── */

const blank = () => ({ slug: '', name_ru: '', name_en: '' })
const editId = ref<number | null>(null)
const form   = ref(blank())
const saving = ref(false)
const isNew  = computed(() => editId.value === -1)

function startNew() { editId.value = -1; form.value = blank() }
function startEdit(g: Group) { editId.value = g.id; form.value = { slug: g.slug, name_ru: g.name_ru, name_en: g.name_en } }
function cancel() { editId.value = null }

async function saveGroup() {
  saving.value = true
  try {
    if (isNew.value) await api.post('/api/admin/skills', { ...form.value, order: groups.value.length })
    else             await api.patch(`/api/admin/skills/groups/${editId.value}`, form.value)
    await refresh()
    editId.value = null
    toast.ok('Group saved')
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    saving.value = false
  }
}

async function removeGroup(g: Group) {
  const ok = await confirm.ask({
    title: 'Delete group?',
    text:  `«${g.name_en || g.name_ru}» and its ${g.skills.length} skill(s) will be removed permanently.`,
  })
  if (!ok) return
  try {
    await api.remove(`/api/admin/skills/groups/${g.id}`)
    if (editId.value === g.id) editId.value = null
    await refresh()
    toast.ok('Group deleted')
  } catch (e) {
    toast.err(adminError(e))
  }
}

async function reorderGroups(ids: number[]) {
  const before = [...groups.value]
  const byId = new Map(before.map((g) => [g.id, g]))
  data.value = ids.map((id) => byId.get(id)).filter(Boolean) as Group[]
  try {
    await api.patch('/api/admin/skills/groups/reorder', { ids })
  } catch (e) {
    data.value = before
    toast.err(adminError(e))
  }
}

/* ── Skills inside a group ──
   Edited in the list itself: an entry has a single field, and opening a separate
   form for it would be an extra step on every rename. */

const draft = reactive<Record<number, string>>({})

async function addSkill(g: Group) {
  const name = (draft[g.id] ?? '').trim()
  if (!name) return
  try {
    await api.post('/api/admin/skills/items', { group_id: g.id, name, order: g.skills.length })
    draft[g.id] = ''
    await refresh()
  } catch (e) {
    toast.err(adminError(e))
  }
}

async function renameSkill(s: Skill, name: string) {
  const next = name.trim()
  if (!next || next === s.name) return
  try {
    await api.patch(`/api/admin/skills/items/${s.id}`, { name: next })
    s.name = next
  } catch (e) {
    toast.err(adminError(e))
    await refresh()
  }
}

async function removeSkill(g: Group, s: Skill) {
  try {
    await api.remove(`/api/admin/skills/items/${s.id}`)
    g.skills = g.skills.filter((x) => x.id !== s.id)
  } catch (e) {
    toast.err(adminError(e))
    await refresh()
  }
}

async function reorderSkills(g: Group, ids: number[]) {
  const before = [...g.skills]
  const byId = new Map(before.map((s) => [s.id, s]))
  g.skills = ids.map((id) => byId.get(id)).filter(Boolean) as Skill[]
  try {
    await api.patch('/api/admin/skills/items/reorder', { ids })
  } catch (e) {
    g.skills = before
    toast.err(adminError(e))
  }
}

const total = computed(() => groups.value.reduce((n, g) => n + g.skills.length, 0))
</script>

<template>
  <AdminPage title="Skills" :note="`${groups.length} group(s) · ${total} skill(s)`">
    <template #actions>
      <button class="admin-btn admin-btn--primary" type="button" @click="startNew">+ Group</button>
    </template>

    <div v-if="editId !== null" class="admin-panel form">
      <div class="admin-grid">
        <AdminField v-model="form.slug" label="Slug" required placeholder="frontend" />
        <AdminField v-model="form.name_ru" label="Name RU" required />
        <AdminField v-model="form.name_en" label="Name EN" required />
      </div>
      <div class="form__actions">
        <button class="admin-btn admin-btn--primary" type="button" :disabled="saving" @click="saveGroup">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="admin-btn admin-btn--ghost" type="button" @click="cancel">Cancel</button>
      </div>
    </div>

    <p v-if="!groups.length" class="admin-empty">No skill groups yet</p>

    <AdminSortable :items="groups" @reorder="reorderGroups">
      <template #default="{ item: group }">
        <div class="group">
          <div class="group__head">
            <div class="group__title">
              <span class="group__name">{{ group.name_en || group.name_ru }}</span>
              <code class="group__slug">{{ group.slug }}</code>
            </div>
            <div class="group__actions">
              <button class="admin-btn admin-btn--ghost" type="button" @click="startEdit(group)">Edit</button>
              <button class="admin-btn admin-btn--danger" type="button" @click="removeGroup(group)">Delete</button>
            </div>
          </div>

          <AdminSortable :items="group.skills" @reorder="(ids) => reorderSkills(group, ids)">
            <template #default="{ item: skill }">
              <div class="skill">
                <input
                  class="admin-input skill__input"
                  :value="skill.name"
                  @change="renameSkill(skill, ($event.target as HTMLInputElement).value)"
                >
                <button class="skill__del" type="button" aria-label="Delete skill" @click="removeSkill(group, skill)">×</button>
              </div>
            </template>
          </AdminSortable>

          <form class="add" @submit.prevent="addSkill(group)">
            <input
              v-model="draft[group.id]"
              class="admin-input add__input"
              placeholder="New skill…"
            >
            <button class="admin-btn admin-btn--ghost" type="submit">Add</button>
          </form>
        </div>
      </template>
    </AdminSortable>
  </AdminPage>
</template>

<style scoped>
.form { margin-bottom: 20px; display: flex; flex-direction: column; gap: 16px; }
.form__actions { display: flex; gap: 8px; }

.group { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }

.group__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.group__title { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.group__name { font-size: 14px; color: var(--text); }
.group__slug { font-size: 10.5px; color: var(--text-4); }
.group__actions { display: flex; gap: 6px; }

.skill { display: flex; align-items: center; gap: 6px; padding: 4px 6px; }

.skill__input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
  background: transparent;
  border: 1px solid transparent;
  transition: border-color 0.15s, background 0.15s;
}

.skill__input:hover { border-color: var(--border); }
.skill__input:focus { background: var(--bg); }

.skill__del {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  font-size: 16px;
  line-height: 1;
  color: var(--text-4);
  background: none;
  border: none;
  border-radius: var(--r-s);
  cursor: pointer;
}

.skill__del:hover { color: var(--red); background: var(--red-bg); }

.add { display: flex; gap: 8px; }

.add__input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
}
</style>
