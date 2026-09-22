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
}

const res = useAdminResource<Edu, ReturnType<typeof blank>>({
  endpoint: '/api/admin/education',
  title:    'Education entry',
  blank,
  toForm: (e) => ({
    institution:       e.institution,
    specialization_ru: e.specialization_ru,
    specialization_en: e.specialization_en,
    date_from:         e.date_from,
    date_to:           e.date_to ?? '',
  }),
  // An empty date field means "to this day", and the column expects null: without
  // this Postgres rejected the whole request.
  toBody: (f) => ({ ...f, date_to: f.date_to || null }),
})

function blank() {
  return {
    institution: '', specialization_ru: '', specialization_en: '',
    date_from: '', date_to: '',
  }
}

const { period } = useAdminFormat()
</script>

<template>
  <AdminPage title="Education" :note="`${res.items.value.length} entries · drag to reorder`">
    <template #actions>
      <button class="admin-btn admin-btn--primary" type="button" @click="res.startNew()">+ New entry</button>
    </template>

    <div v-if="res.editing.value" class="admin-panel form">
      <div class="admin-grid">
        <AdminField v-model="res.form.value.institution" label="Institution" required />
        <AdminField v-model="res.form.value.specialization_ru" label="Specialization (RU)" required />
        <AdminField v-model="res.form.value.specialization_en" label="Specialization (EN)" />
        <AdminField v-model="res.form.value.date_from" label="From" type="date" required />
        <AdminField v-model="res.form.value.date_to" label="To" type="date" hint="Empty — still studying" />
      </div>

      <div class="form__actions">
        <button class="admin-btn admin-btn--ghost" type="button" @click="res.cancel()">Cancel</button>
        <button class="admin-btn admin-btn--primary" type="button" :disabled="res.saving.value" @click="res.save()">
          {{ res.saving.value ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <AdminSortable :items="res.items.value" @reorder="res.reorder">
      <template #default="{ item }">
        <div class="row">
          <div class="row__main">
            <p class="row__title">{{ item.specialization_ru }}</p>
            <p class="row__sub">{{ item.institution }}</p>
          </div>
          <span class="row__period">{{ period(item.date_from, item.date_to) }}</span>
          <div class="row__actions">
            <button class="admin-btn admin-btn--ghost" type="button" @click="res.startEdit(item)">Edit</button>
            <button class="admin-btn admin-btn--danger" type="button" @click="res.remove(item, item.institution)">Delete</button>
          </div>
        </div>
      </template>
    </AdminSortable>

    <p v-if="!res.items.value.length && !res.loading.value" class="admin-empty">No education entries yet</p>
  </AdminPage>
</template>

<style scoped>
.form { margin-bottom: 24px; }
.form__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.row__main { flex: 1; min-width: 180px; }
.row__title { font-size: 13px; color: var(--text); }
.row__sub { font-size: 11px; color: var(--text-4); margin-top: 3px; }
.row__period { font-size: 11px; color: var(--text-3); white-space: nowrap; }
.row__actions { display: flex; gap: 6px; }
</style>
