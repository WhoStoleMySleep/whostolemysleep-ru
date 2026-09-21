<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Settings' })

interface Settings {
  open_to_work: boolean
  show_search:  boolean
  github_url:   string
  telegram_url: string
  email:        string
}

const { form, dirty, saving, save } = useAdminForm<Settings, Settings>({
  endpoint: '/api/admin/settings',
  title:    'Settings',
  toForm: (d) => ({
    open_to_work: d?.open_to_work ?? true,
    show_search:  d?.show_search  ?? true,
    github_url:   d?.github_url   ?? '',
    telegram_url: d?.telegram_url ?? '',
    email:        d?.email        ?? '',
  }),
})
</script>

<template>
  <AdminPage title="Settings" :note="dirty ? 'Unsaved changes · ⌘S to save' : 'In sync'">
    <template #actions>
      <button class="admin-btn admin-btn--primary" type="button" :disabled="saving || !dirty" @click="save()">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </template>

    <div class="admin-panel block">
      <p class="block__title">Visibility</p>
      <AdminField v-model="form.open_to_work" type="checkbox" label="Open to work — shows the status badge on the site" />
      <AdminField v-model="form.show_search" type="checkbox" label="Search — shows the search button in the header" />
    </div>

    <div class="admin-panel block">
      <p class="block__title">Contacts</p>
      <div class="admin-grid">
        <AdminField v-model="form.email" label="Email" type="email" />
        <AdminField v-model="form.github_url" label="GitHub" type="url" placeholder="https://github.com/…" />
        <AdminField v-model="form.telegram_url" label="Telegram" type="url" placeholder="https://t.me/…" />
      </div>
    </div>
  </AdminPage>
</template>

<style scoped>
.block { margin-bottom: 16px; display: flex; flex-direction: column; gap: 14px; }

.block__title {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-4);
}
</style>
