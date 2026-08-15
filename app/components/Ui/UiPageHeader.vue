<script setup lang="ts">
defineProps<{
  eyebrow: string
  num?: string
  title: string
  subtitle?: string
  /** Увеличенный кегль — для страницы контактов. */
  large?: boolean
}>()
</script>

<template>
  <header class="ph" :class="{ 'ph--large': large }">
    <p class="ph__eyebrow">
      {{ eyebrow }}<template v-if="num"> / {{ num }}</template>
    </p>
    <h1 class="ph__title">{{ title }}<span class="ph__stop">.</span></h1>
    <p v-if="subtitle" class="ph__sub">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
.ph {
  padding: 0 0 clamp(24px, 3vw, 44px);
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.ph__eyebrow {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
}


.ph__title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--page-title-size);
  line-height: var(--display-lh);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-wrap: balance;
  margin: 20px 0 0;
}

.ph--large .ph__title { font-size: var(--page-title-size-lg); }

.ph__stop { color: var(--accent); }

.ph__sub {
  margin: 22px 0 0;
  max-width: 520px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-3);
  text-wrap: pretty;
}
</style>
