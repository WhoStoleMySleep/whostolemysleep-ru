<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Education' })

interface Edu {
  id: number
  institution: string
  specialization_ru: string
  specialization_en: string
  date_from: string
  date_to: string | null
  order: number
}

const EMPTY = () => ({
  institution: '', specialization_ru: '', specialization_en: '',
  date_from: '', date_to: '', order: 0,
})

const { data: list, refresh } = await useFetch<Edu[]>('/api/admin/education')

const editId = ref<number | null>(null)
const form   = ref(EMPTY())
const saving = ref(false)
const errMsg = ref('')

function startNew() {
  editId.value = -1
  form.value   = { ...EMPTY(), order: list.value?.length ?? 0 }
}

function startEdit(edu: Edu) {
  editId.value = edu.id
  form.value = {
    institution:       edu.institution,
    specialization_ru: edu.specialization_ru,
    specialization_en: edu.specialization_en,
    date_from:         edu.date_from,
    date_to:           edu.date_to ?? '',
    order:             edu.order,
  }
}

function cancel() { editId.value = null; errMsg.value = '' }

async function save() {
  saving.value = true; errMsg.value = ''
  try {
    const body = { ...form.value, date_to: form.value.date_to || null }
    if (editId.value === -1) {
      await $fetch('/api/admin/education', { method: 'POST', body })
    } else {
      await $fetch(`/api/admin/education/${editId.value}`, { method: 'PATCH', body })
    }
    await refresh()
    editId.value = null
  } catch (e: any) {
    errMsg.value = e?.data?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Delete this education entry?')) return
  await $fetch(`/api/admin/education/${id}`, { method: 'DELETE' })
  await refresh()
  if (editId.value === id) editId.value = null
}

function formatDate(d: string | null) {
  if (!d) return 'present'
  const [y, m] = d.split('-')
  return `${m}.${y}`
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="dash-title">Education</div>
      <button class="admin-btn admin-btn--primary" @click="startNew">+ Add New</button>
    </div>

    <!-- New Form -->
    <div v-if="editId === -1" class="edu-form edu-form--new">
      <p class="form-section-title">New Education</p>
      <div class="form-fields">
        <div class="field-group">
          <label class="field-label">Institution</label>
          <input v-model="form.institution" class="admin-input" />
        </div>
        <div class="field-2col">
          <div class="field-group">
            <label class="field-label">Specialization RU</label>
            <input v-model="form.specialization_ru" class="admin-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Specialization EN</label>
            <input v-model="form.specialization_en" class="admin-input" />
          </div>
        </div>
        <div class="field-2col">
          <div class="field-group">
            <label class="field-label">Date From (YYYY-MM-DD)</label>
            <input v-model="form.date_from" class="admin-input" placeholder="2021-09-01" />
          </div>
          <div class="field-group">
            <label class="field-label">Date To (empty = present)</label>
            <input v-model="form.date_to" class="admin-input" placeholder="2025-06-01" />
          </div>
        </div>
        <div class="field-group" style="max-width:160px">
          <label class="field-label">Order</label>
          <input v-model.number="form.order" class="admin-input" type="number" />
        </div>
        <p v-if="errMsg" class="err-msg">{{ errMsg }}</p>
        <div class="form-actions">
          <button class="admin-btn admin-btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button class="admin-btn admin-btn--ghost" @click="cancel">Cancel</button>
        </div>
      </div>
    </div>

    <!-- List -->
    <div v-if="list?.length" class="edu-list">
      <div v-for="edu in list" :key="edu.id" class="edu-item">
        <div class="edu-item__row">
          <div class="edu-item__info">
            <span class="edu-item__inst">{{ edu.institution }}</span>
            <span class="edu-item__spec">{{ edu.specialization_ru }}</span>
            <span class="edu-item__dates">{{ formatDate(edu.date_from) }} → {{ formatDate(edu.date_to) }}</span>
          </div>
          <div class="edu-item__actions">
            <button class="act-btn" @click="editId === edu.id ? cancel() : startEdit(edu)">
              {{ editId === edu.id ? 'Cancel' : 'Edit' }}
            </button>
            <button class="act-btn act-btn--del" @click="remove(edu.id)">Delete</button>
          </div>
        </div>

        <!-- Inline Edit Form -->
        <div v-if="editId === edu.id" class="edu-form">
          <div class="form-fields">
            <div class="field-group">
              <label class="field-label">Institution</label>
              <input v-model="form.institution" class="admin-input" />
            </div>
            <div class="field-2col">
              <div class="field-group">
                <label class="field-label">Specialization RU</label>
                <input v-model="form.specialization_ru" class="admin-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Specialization EN</label>
                <input v-model="form.specialization_en" class="admin-input" />
              </div>
            </div>
            <div class="field-2col">
              <div class="field-group">
                <label class="field-label">Date From (YYYY-MM-DD)</label>
                <input v-model="form.date_from" class="admin-input" placeholder="2021-09-01" />
              </div>
              <div class="field-group">
                <label class="field-label">Date To (empty = present)</label>
                <input v-model="form.date_to" class="admin-input" placeholder="2025-06-01" />
              </div>
            </div>
            <div class="field-group" style="max-width:160px">
              <label class="field-label">Order</label>
              <input v-model.number="form.order" class="admin-input" type="number" />
            </div>
            <p v-if="errMsg" class="err-msg">{{ errMsg }}</p>
            <div class="form-actions">
              <button class="admin-btn admin-btn--primary" :disabled="saving" @click="save">
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button class="admin-btn admin-btn--ghost" @click="cancel">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="editId !== -1" class="empty-state">No education entries yet</div>
  </div>
</template>

<style scoped>
.dash-title { font-size: 22px; font-weight: 300; letter-spacing: -0.02em; color: #e2e2e8; }
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.edu-list { display: flex; flex-direction: column; gap: 1px; background: #14141e; }
.edu-item { background: #0d0d14; }
.edu-item__row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 16px; }
.edu-item__info { display: flex; flex-direction: column; gap: 4px; }
.edu-item__inst { font-size: 13px; color: #e2e2e8; }
.edu-item__spec { font-size: 11px; color: #888; }
.edu-item__dates { font-size: 10px; color: #444460; letter-spacing: 0.05em; }
.edu-item__actions { display: flex; gap: 8px; flex-shrink: 0; }
.edu-form { border-top: 1px solid #1e1e2e; padding: 20px; background: #0a0a12; }
.edu-form--new { border: 1px solid #1e1e2e; background: #0a0a12; margin-bottom: 16px; padding: 20px; }
.form-section-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; margin-bottom: 16px; }
.form-fields { display: flex; flex-direction: column; gap: 16px; }
.field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }
.admin-input { background: #14141e; border: 1px solid #2a2a3e; color: #a0a0b8; font-family: 'Martian Mono', monospace; font-size: 12px; padding: 8px 12px; outline: none; transition: border-color 0.15s; width: 100%; }
.admin-input:focus { border-color: #f0c060; color: #e2e2e8; }
.act-btn { font-family: 'Martian Mono', monospace; font-size: 11px; letter-spacing: 0.05em; padding: 5px 10px; border: 1px solid #2a2a3e; background: transparent; color: #888; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
.act-btn:hover { border-color: #f0c060; color: #f0c060; }
.act-btn--del:hover { border-color: #f06060; color: #f06060; }
.err-msg { font-size: 11px; color: #f06060; }
.form-actions { display: flex; gap: 10px; }
.empty-state { padding: 40px 20px; text-align: center; color: #444460; font-size: 12px; }
</style>
