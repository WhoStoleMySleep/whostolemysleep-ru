/**
 * Доля прокрученной страницы, 0..1.
 * Слушатели вешаются только на клиенте и снимаются при размонтировании.
 */
export const useScrollProgress = () => {
  const progress = ref(0)

  function update() {
    const max = document.documentElement.scrollHeight - window.innerHeight
    progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
  }

  onMounted(() => {
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    update()
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  })

  function toTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { progress, toTop }
}
