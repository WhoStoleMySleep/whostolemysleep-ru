<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <svg
    class="pinned-icon"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <path d="M9 3h6M10 3v6l-3 4v2h10v-2l-3-4V3M12 15v6" />
  </svg>
</template>

<style scoped>
.pinned-icon {
  display: block;
  flex-shrink: 0;
  color: var(--accent);
  transform: rotate(35deg);
}
</style>
