export interface UnsavedGuardOptions {
  dirty: Ref<boolean>
  save:  () => unknown
}

/**
 * Keeps edits in the admin panel from being lost: a warning on closing the tab, a
 * confirmation before leaving the route, and Ctrl/Cmd+S as save — muscle memory
 * from every editor, while the browser's "save page" is useless here.
 *
 * The single-form pages and the post editor each carried their own copy of these
 * three listeners.
 */
export function useUnsavedGuard({ dirty, save }: UnsavedGuardOptions) {
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty.value) e.preventDefault()
  }

  function onKey(e: KeyboardEvent) {
    const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's'
    if (!isSave) return
    e.preventDefault()
    if (dirty.value) save()
  }

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('keydown', onKey)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('keydown', onKey)
  })

  onBeforeRouteLeave(() => {
    if (!dirty.value) return true
    return useAdminConfirm().ask({
      title:  'Leave with unsaved changes?',
      text:   'Edits on this page will be lost.',
      action: 'Leave',
    })
  })
}
