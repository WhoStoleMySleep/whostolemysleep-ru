<script setup lang="ts">
const { init } = useTheme()
const isFading = useState('lang-fade', () => false)
onMounted(init)
</script>

<template>
  <div class="app-root" :class="{ 'app-root--fading': isFading }">
    <NuxtLayout>
      <NuxtPage />
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
