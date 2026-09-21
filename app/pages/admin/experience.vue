<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Experience' })

interface Bullet { id: number; text_ru: string; text_en: string }
interface Exp {
  id: number
  company: string
  position_ru: string
  position_en: string
  date_from: string
  date_to: string | null
  bullets: Bullet[]
}

function blank() {
  return {
    company: '', position_ru: '', position_en: '',
    date_from: '', date_to: '',
    bullets: [] as { text_ru: string; text_en: string }[],
  }
}

const res = useAdminResource<Exp, ReturnType<typeof blank>>({
  endpoint: '/api/admin/experience',
  title:    'Experience entry',
  blank,
  toForm: (e) => ({
    company:     e.company,
    position_ru: e.position_ru,
    position_en: e.position_en,
    date_from:   e.date_from,
    date_to:     e.date_to ?? '',
    bullets:     e.bullets.map((b) => ({ text_ru: b.text_ru, text_en: b.text_en })),
  }),
  toBody: (f) => ({ ...f, date_to: f.date_to || null }),
})

const { period } = useAdminFormat()

function addBullet()          { res.form.value.bullets.push({ text_ru: '', text_en: '' }) }
function removeBullet(i: number) { res.form.value.bullets.splice(i, 1) }
</script>

<template>
  <AdminPage title="Experience" :note="`${res.items.value.length} entries · drag to reorder`">
    <template #actions>
      <button class="admin-btn admin-btn--primary" type="button" @click="res.startNew()">+ New entry</button>
    </template>

    <div v-if="res.editing.value" class="admin-panel form">
      <div class="admin-grid">
        <AdminField v-model="res.form.value.company" label="Company" required />
        <AdminField v-model="res.form.value.position_ru" label="Position (RU)" required />
        <AdminField v-model="res.form.value.position_en" label="Position (EN)" />
        <AdminField v-model="res.form.value.date_from" label="From" type="date" required />
        <AdminField v-model="res.form.value.date_to" label="To" type="date" hint="Empty — current job" />
      </div>

      <div class="bullets">
        <div class="bullets__head">
          <p class="bullets__label">Responsibilities</p>
          <button class="admin-btn admin-btn--ghost" type="button" @click="addBullet">+ Add</button>
        </div>

        <div v-for="(bullet, i) in res.form.value.bullets" :key="i" class="bullet">
          <AdminField v-model="bullet.text_ru" placeholder="RU" />
          <AdminField v-model="bullet.text_en" placeholder="EN" />
          <button class="admin-btn admin-btn--danger bullet__del" type="button" @click="removeBullet(i)">×</button>
        </div>

        <p v-if="!res.form.value.bullets.length" class="bullets__empty">No bullet points</p>
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
            <p class="row__title">{{ item.position_ru }}</p>
            <p class="row__sub">{{ item.company }} · {{ item.bullets.length }} bullets</p>
          </div>
          <span class="row__period">{{ period(item.date_from, item.date_to) }}</span>
          <div class="row__actions">
            <button class="admin-btn admin-btn--ghost" type="button" @click="res.startEdit(item)">Edit</button>
            <button class="admin-btn admin-btn--danger" type="button" @click="res.remove(item, item.company)">Delete</button>
          </div>
        </div>
      </template>
    </AdminSortable>

    <p v-if="!res.items.value.length && !res.loading.value" class="admin-empty">No experience entries yet</p>
  </AdminPage>
</template>

<style scoped>
.form { margin-bottom: 24px; }
.form__actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

.bullets { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border); }

.bullets__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.bullets__label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-4);
}

.bullets__empty { font-size: 11px; color: var(--text-4); }

.bullet {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: start;
  margin-bottom: 8px;
}

.bullet__del { padding: 8px 12px; font-size: 13px; }

@media (max-width: 700px) {
  .bullet { grid-template-columns: 1fr auto; }
}

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
