<script setup lang="ts">
const { init } = useTheme()
const isFading = useState('lang-fade', () => false)
onMounted(init)

const TRANSITION_NORMAL  = { name: 'page', mode: 'out-in' as const }
const TRANSITION_INSTANT = { name: 'page', mode: 'out-in' as const, duration: 0 }
const pageTransition = computed(() =>
  isFading.value ? TRANSITION_INSTANT : TRANSITION_NORMAL
)

const head = useLocaleHead({ addSeoAttributes: true })
useHead(() => ({
  htmlAttrs: head.value.htmlAttrs,
  link:      head.value.link,
  meta:      head.value.meta,
}))
</script>

<template>
  <div class="app-root" :class="{ 'app-root--fading': isFading }">
    <NuxtLayout>
      <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
  </div>
</template>

<style>
.app-root {
  transition: opacity 0.3s ease;
}
.app-root--fading {
  opacity: 0;
}
</style>
