<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Experience' })

interface Bullet { text_ru: string; text_en: string }
interface Exp {
  id: number
  company: string
  position_ru: string
  position_en: string
  date_from: string
  date_to: string | null
  order: number
  bullets: (Bullet & { id: number; order: number })[]
}

const EMPTY = () => ({
  company: '', position_ru: '', position_en: '',
  date_from: '', date_to: '', order: 0, bullets: [] as Bullet[],
})

const { data: list, refresh } = await useFetch<Exp[]>('/api/admin/experience')

const editId  = ref<number | null>(null)
const form    = ref(EMPTY())
const saving  = ref(false)
const errMsg  = ref('')

function startNew() {
  editId.value = -1
  form.value   = { ...EMPTY(), order: list.value?.length ?? 0 }
}

function startEdit(exp: Exp) {
  editId.value = exp.id
  form.value = {
    company:     exp.company,
    position_ru: exp.position_ru,
    position_en: exp.position_en,
    date_from:   exp.date_from,
    date_to:     exp.date_to ?? '',
    order:       exp.order,
    bullets:     exp.bullets.map((b) => ({ text_ru: b.text_ru, text_en: b.text_en })),
  }
}

function cancel() { editId.value = null; errMsg.value = '' }

function addBullet() { form.value.bullets.push({ text_ru: '', text_en: '' }) }
function removeBullet(i: number) { form.value.bullets.splice(i, 1) }

async function save() {
  saving.value = true; errMsg.value = ''
  try {
    const body = { ...form.value, date_to: form.value.date_to || null }
    if (editId.value === -1) {
      await $fetch('/api/admin/experience', { method: 'POST', body })
    } else {
      await $fetch(`/api/admin/experience/${editId.value}`, { method: 'PATCH', body })
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
  if (!confirm('Delete this experience entry?')) return
  await $fetch(`/api/admin/experience/${id}`, { method: 'DELETE' })
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
      <div class="dash-title">Experience</div>
      <button class="admin-btn admin-btn--primary" @click="startNew">+ Add New</button>
    </div>

    <!-- New Form -->
    <div v-if="editId === -1" class="exp-form exp-form--new">
      <p class="form-section-title">New Experience</p>
      <div class="form-fields">
        <div class="field-2col">
          <div class="field-group">
            <label class="field-label">Company</label>
            <input v-model="form.company" class="admin-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Order</label>
            <input v-model.number="form.order" class="admin-input" type="number" />
          </div>
        </div>
        <div class="field-2col">
          <div class="field-group">
            <label class="field-label">Position RU</label>
            <input v-model="form.position_ru" class="admin-input" />
          </div>
          <div class="field-group">
            <label class="field-label">Position EN</label>
            <input v-model="form.position_en" class="admin-input" />
          </div>
        </div>
        <div class="field-2col">
          <div class="field-group">
            <label class="field-label">Date From (YYYY-MM-DD)</label>
            <input v-model="form.date_from" class="admin-input" placeholder="2023-04-01" />
          </div>
          <div class="field-group">
            <label class="field-label">Date To (empty = present)</label>
            <input v-model="form.date_to" class="admin-input" placeholder="2024-01-01" />
          </div>
        </div>
        <div class="bullets-section">
          <div class="bullets-head">
            <span class="field-label">Bullets</span>
            <button class="act-btn" @click="addBullet">+ Add</button>
          </div>
          <div v-for="(b, i) in form.bullets" :key="i" class="bullet-row">
            <div class="bullet-fields">
              <input v-model="b.text_ru" class="admin-input" placeholder="RU" />
              <input v-model="b.text_en" class="admin-input" placeholder="EN" />
            </div>
            <button class="act-btn act-btn--del" @click="removeBullet(i)">×</button>
          </div>
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
    <div v-if="list?.length" class="exp-list">
      <div v-for="exp in list" :key="exp.id" class="exp-item">
        <div class="exp-item__row">
          <div class="exp-item__info">
            <span class="exp-item__company">{{ exp.company }}</span>
            <span class="exp-item__pos">{{ exp.position_ru }}</span>
            <span class="exp-item__dates">{{ formatDate(exp.date_from) }} → {{ formatDate(exp.date_to) }}</span>
          </div>
          <div class="exp-item__actions">
            <button class="act-btn" @click="editId === exp.id ? cancel() : startEdit(exp)">
              {{ editId === exp.id ? 'Cancel' : 'Edit' }}
            </button>
            <button class="act-btn act-btn--del" @click="remove(exp.id)">Delete</button>
          </div>
        </div>

        <!-- Inline Edit Form -->
        <div v-if="editId === exp.id" class="exp-form">
          <div class="form-fields">
            <div class="field-2col">
              <div class="field-group">
                <label class="field-label">Company</label>
                <input v-model="form.company" class="admin-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Order</label>
                <input v-model.number="form.order" class="admin-input" type="number" />
              </div>
            </div>
            <div class="field-2col">
              <div class="field-group">
                <label class="field-label">Position RU</label>
                <input v-model="form.position_ru" class="admin-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Position EN</label>
                <input v-model="form.position_en" class="admin-input" />
              </div>
            </div>
            <div class="field-2col">
              <div class="field-group">
                <label class="field-label">Date From (YYYY-MM-DD)</label>
                <input v-model="form.date_from" class="admin-input" placeholder="2023-04-01" />
              </div>
              <div class="field-group">
                <label class="field-label">Date To (empty = present)</label>
                <input v-model="form.date_to" class="admin-input" placeholder="2024-01-01" />
              </div>
            </div>
            <div class="bullets-section">
              <div class="bullets-head">
                <span class="field-label">Bullets</span>
                <button class="act-btn" @click="addBullet">+ Add</button>
              </div>
              <div v-for="(b, i) in form.bullets" :key="i" class="bullet-row">
                <div class="bullet-fields">
                  <input v-model="b.text_ru" class="admin-input" placeholder="RU" />
                  <input v-model="b.text_en" class="admin-input" placeholder="EN" />
                </div>
                <button class="act-btn act-btn--del" @click="removeBullet(i)">×</button>
              </div>
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

    <div v-else-if="editId !== -1" class="empty-state">No experience entries yet</div>
  </div>
</template>

<style scoped>
.dash-title { font-size: 22px; font-weight: 300; letter-spacing: -0.02em; color: #e2e2e8; }
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }

.exp-list { display: flex; flex-direction: column; gap: 1px; background: #14141e; }
.exp-item { background: #0d0d14; }
.exp-item__row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; gap: 16px; }
.exp-item__info { display: flex; flex-direction: column; gap: 4px; }
.exp-item__company { font-size: 13px; color: #e2e2e8; }
.exp-item__pos { font-size: 11px; color: #888; }
.exp-item__dates { font-size: 10px; color: #444460; letter-spacing: 0.05em; }
.exp-item__actions { display: flex; gap: 8px; flex-shrink: 0; }

.exp-form { border-top: 1px solid #1e1e2e; padding: 20px; background: #0a0a12; }
.exp-form--new { border: 1px solid #1e1e2e; background: #0a0a12; margin-bottom: 16px; padding: 20px; }
.form-section-title { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; margin-bottom: 16px; }

.form-fields { display: flex; flex-direction: column; gap: 16px; }
.field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }

.admin-input {
  background: #14141e; border: 1px solid #2a2a3e; color: #a0a0b8;
  font-family: 'Martian Mono', monospace; font-size: 12px; padding: 8px 12px;
  outline: none; transition: border-color 0.15s; width: 100%;
}
.admin-input:focus { border-color: #f0c060; color: #e2e2e8; }

.bullets-section { display: flex; flex-direction: column; gap: 8px; }
.bullets-head { display: flex; align-items: center; justify-content: space-between; }
.bullet-row { display: flex; align-items: flex-start; gap: 8px; }
.bullet-fields { display: flex; flex-direction: column; gap: 4px; flex: 1; }

.act-btn {
  font-family: 'Martian Mono', monospace; font-size: 11px; letter-spacing: 0.05em;
  padding: 5px 10px; border: 1px solid #2a2a3e; background: transparent;
  color: #888; cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.act-btn:hover { border-color: #f0c060; color: #f0c060; }
.act-btn--del:hover { border-color: #f06060; color: #f06060; }

.err-msg { font-size: 11px; color: #f06060; }
.form-actions { display: flex; gap: 10px; }
.empty-state { padding: 40px 20px; text-align: center; color: #444460; font-size: 12px; }
</style>
