<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Skills' })

interface SkillItem { id: number; name: string; order: number }
interface Group { id: number; slug: string; name_ru: string; name_en: string; order: number; skills: SkillItem[] }

const { data: groups, refresh } = await useFetch<Group[]>('/api/admin/skills')

const editGroupId   = ref<number | null>(null)
const editSkillId   = ref<number | null>(null)
const newGroupOpen  = ref(false)
const newSkillGroup = ref<number | null>(null)

const groupForm = ref({ slug: '', name_ru: '', name_en: '', order: 0 })
const skillForm = ref({ name: '', order: 0, group_id: 0 })
const newSkillName = ref('')

const saving = ref(false)
const errMsg = ref('')

function openEditGroup(g: Group) {
  editGroupId.value = g.id
  groupForm.value   = { slug: g.slug, name_ru: g.name_ru, name_en: g.name_en, order: g.order }
}

function cancelGroup() { editGroupId.value = null; newGroupOpen.value = false; errMsg.value = '' }

async function saveGroup(id: number | null) {
  saving.value = true; errMsg.value = ''
  try {
    if (id === null) {
      await $fetch('/api/admin/skills', { method: 'POST', body: { ...groupForm.value } })
    } else {
      await $fetch(`/api/admin/skills/groups/${id}`, { method: 'PATCH', body: groupForm.value })
    }
    await refresh()
    cancelGroup()
  } catch (e: any) {
    errMsg.value = e?.data?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}

async function deleteGroup(id: number) {
  if (!confirm('Delete group and all its skills?')) return
  await $fetch(`/api/admin/skills/groups/${id}`, { method: 'DELETE' })
  await refresh()
}

function openNewGroup() {
  newGroupOpen.value = true
  groupForm.value    = { slug: '', name_ru: '', name_en: '', order: groups.value?.length ?? 0 }
  editGroupId.value  = null
}

function openNewSkill(groupId: number) {
  newSkillGroup.value = groupId
  newSkillName.value  = ''
  editSkillId.value   = null
}

function cancelSkill() { newSkillGroup.value = null; editSkillId.value = null; newSkillName.value = '' }

async function addSkill(groupId: number) {
  const name = newSkillName.value.trim()
  if (!name) return
  saving.value = true
  try {
    const g = groups.value?.find((x) => x.id === groupId)
    await $fetch('/api/admin/skills/items', { method: 'POST', body: { group_id: groupId, name, order: g?.skills.length ?? 0 } })
    await refresh()
    cancelSkill()
  } finally {
    saving.value = false
  }
}

async function saveSkillName(id: number, name: string) {
  await $fetch(`/api/admin/skills/items/${id}`, { method: 'PATCH', body: { name } })
  await refresh()
  cancelSkill()
}

async function deleteSkill(id: number) {
  if (!confirm('Delete this skill?')) return
  await $fetch(`/api/admin/skills/items/${id}`, { method: 'DELETE' })
  await refresh()
}

const editSkillName = ref('')
function openEditSkill(s: SkillItem) {
  editSkillId.value = s.id
  editSkillName.value = s.name
  newSkillGroup.value = null
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="dash-title">Skills</div>
      <button class="admin-btn admin-btn--primary" @click="openNewGroup">+ Add Group</button>
    </div>

    <!-- New Group Form -->
    <div v-if="newGroupOpen" class="group-form-block">
      <p class="form-title">New Group</p>
      <div class="field-2col">
        <div class="field-group">
          <label class="field-label">Slug</label>
          <input v-model="groupForm.slug" class="admin-input" placeholder="languages" />
        </div>
        <div class="field-group">
          <label class="field-label">Order</label>
          <input v-model.number="groupForm.order" class="admin-input" type="number" />
        </div>
      </div>
      <div class="field-2col">
        <div class="field-group">
          <label class="field-label">Name RU</label>
          <input v-model="groupForm.name_ru" class="admin-input" placeholder="Языки" />
        </div>
        <div class="field-group">
          <label class="field-label">Name EN</label>
          <input v-model="groupForm.name_en" class="admin-input" placeholder="Languages" />
        </div>
      </div>
      <p v-if="errMsg" class="err-msg">{{ errMsg }}</p>
      <div class="form-actions">
        <button class="admin-btn admin-btn--primary" :disabled="saving" @click="saveGroup(null)">
          {{ saving ? 'Saving...' : 'Add Group' }}
        </button>
        <button class="admin-btn" @click="cancelGroup">Cancel</button>
      </div>
    </div>

    <!-- Groups -->
    <div v-for="g in groups" :key="g.id" class="group-block">
      <!-- Group Header -->
      <div class="group-header">
        <div v-if="editGroupId === g.id" class="group-edit-form">
          <div class="field-2col">
            <div class="field-group">
              <label class="field-label">Slug</label>
              <input v-model="groupForm.slug" class="admin-input" />
            </div>
            <div class="field-group">
              <label class="field-label">Order</label>
              <input v-model.number="groupForm.order" class="admin-input" type="number" />
            </div>
          </div>
          <div class="field-2col">
            <div class="field-group">
              <label class="field-label">Name RU</label>
              <input v-model="groupForm.name_ru" class="admin-input" />
            </div>
            <div class="field-group">
              <label class="field-label">Name EN</label>
              <input v-model="groupForm.name_en" class="admin-input" />
            </div>
          </div>
          <div class="form-actions">
            <button class="admin-btn admin-btn--primary" :disabled="saving" @click="saveGroup(g.id)">Save</button>
            <button class="admin-btn" @click="cancelGroup">Cancel</button>
          </div>
        </div>
        <div v-else class="group-title-row">
          <div class="group-title-info">
            <span class="group-name">{{ g.name_ru }}</span>
            <span class="group-name-en">{{ g.name_en }}</span>
          </div>
          <div class="group-actions">
            <button class="act-btn" @click="openEditGroup(g)">Edit</button>
            <button class="act-btn act-btn--del" @click="deleteGroup(g.id)">Delete</button>
          </div>
        </div>
      </div>

      <!-- Skills List -->
      <div class="skills-list">
        <div v-for="s in g.skills" :key="s.id" class="skill-item">
          <div v-if="editSkillId === s.id" class="skill-edit">
            <input v-model="editSkillName" class="admin-input skill-input" @keydown.enter="saveSkillName(s.id, editSkillName)" @keydown.escape="cancelSkill" />
            <button class="act-btn" @click="saveSkillName(s.id, editSkillName)">Save</button>
            <button class="act-btn" @click="cancelSkill">×</button>
          </div>
          <div v-else class="skill-row">
            <span class="skill-name">{{ s.name }}</span>
            <div class="skill-actions">
              <button class="act-btn-sm" @click="openEditSkill(s)">edit</button>
              <button class="act-btn-sm act-btn-sm--del" @click="deleteSkill(s.id)">×</button>
            </div>
          </div>
        </div>

        <!-- Add Skill -->
        <div v-if="newSkillGroup === g.id" class="skill-new">
          <input
            v-model="newSkillName"
            class="admin-input skill-input"
            placeholder="Skill name"
            @keydown.enter="addSkill(g.id)"
            @keydown.escape="cancelSkill"
            autofocus
          />
          <button class="act-btn" :disabled="saving" @click="addSkill(g.id)">Add</button>
          <button class="act-btn" @click="cancelSkill">×</button>
        </div>
        <button v-else class="add-skill-btn" @click="openNewSkill(g.id)">+ Add skill</button>
      </div>
    </div>

    <div v-if="!groups?.length" class="empty-state">No skill groups yet</div>
  </div>
</template>

<style scoped>
.dash-title { font-size: 22px; font-weight: 300; letter-spacing: -0.02em; color: #e2e2e8; }
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }

.group-form-block {
  border: 1px solid #1e1e2e; background: #0a0a12; padding: 20px; margin-bottom: 20px;
  display: flex; flex-direction: column; gap: 16px;
}
.form-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }

.group-block { border: 1px solid #1e1e2e; background: #0d0d14; margin-bottom: 12px; }

.group-header { padding: 16px 20px; border-bottom: 1px solid #1e1e2e; }
.group-title-row { display: flex; align-items: center; justify-content: space-between; }
.group-title-info { display: flex; flex-direction: column; gap: 2px; }
.group-name { font-size: 13px; color: #e2e2e8; }
.group-name-en { font-size: 11px; color: #666680; }
.group-actions { display: flex; gap: 8px; }
.group-edit-form { display: flex; flex-direction: column; gap: 12px; }

.skills-list { padding: 8px 20px 16px; display: flex; flex-direction: column; gap: 2px; }
.skill-item { }
.skill-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #14141e; }
.skill-row:last-of-type { border-bottom: none; }
.skill-name { font-size: 12px; color: #a0a0b8; }
.skill-actions { display: flex; gap: 6px; }
.skill-edit { display: flex; align-items: center; gap: 6px; padding: 6px 0; }
.skill-new { display: flex; align-items: center; gap: 6px; padding: 8px 0; }
.skill-input { flex: 1; max-width: 320px; }

.act-btn-sm {
  font-family: 'Martian Mono', monospace; font-size: 10px; letter-spacing: 0.05em;
  padding: 3px 7px; border: 1px solid #2a2a3e; background: transparent;
  color: #666680; cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.act-btn-sm:hover { border-color: #f0c060; color: #f0c060; }
.act-btn-sm--del:hover { border-color: #f06060; color: #f06060; }

.add-skill-btn {
  font-family: 'Martian Mono', monospace; font-size: 11px; letter-spacing: 0.05em;
  padding: 6px 0; color: #444460; background: transparent; border: none; cursor: pointer;
  text-align: left; transition: color 0.15s;
}
.add-skill-btn:hover { color: #f0c060; }

.act-btn {
  font-family: 'Martian Mono', monospace; font-size: 11px; letter-spacing: 0.05em;
  padding: 5px 10px; border: 1px solid #2a2a3e; background: transparent;
  color: #888; cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.act-btn:hover { border-color: #f0c060; color: #f0c060; }
.act-btn--del:hover { border-color: #f06060; color: #f06060; }

.field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }
.admin-input { background: #14141e; border: 1px solid #2a2a3e; color: #a0a0b8; font-family: 'Martian Mono', monospace; font-size: 12px; padding: 8px 12px; outline: none; transition: border-color 0.15s; width: 100%; }
.admin-input:focus { border-color: #f0c060; color: #e2e2e8; }
.form-actions { display: flex; gap: 10px; }
.err-msg { font-size: 11px; color: #f06060; }
.empty-state { padding: 40px 20px; text-align: center; color: #444460; font-size: 12px; }
</style>
