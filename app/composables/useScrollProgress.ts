/**
 * How much of the page is scrolled, 0..1.
 * Listeners are attached on the client only and removed on unmount. Reads are
 * batched to one per frame: scroll fires far more often than the screen repaints,
 * and every read of scrollHeight forces layout.
 */
export const useScrollProgress = () => {
  const progress = ref(0)
  let frame = 0

  function update() {
    frame = 0
    const max = document.documentElement.scrollHeight - window.innerHeight
    progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
  }

  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(update)
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    update()
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
  })

  function toTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { progress, toTop }
}
