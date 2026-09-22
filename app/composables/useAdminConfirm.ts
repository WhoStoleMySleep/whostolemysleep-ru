interface ConfirmRequest {
  title: string
  text:  string
  /** Label on the confirm button. */
  action: string
  danger: boolean
}

let resolve: ((ok: boolean) => void) | null = null

/**
 * A replacement for window.confirm. The native dialog cannot be styled, it blocks
 * the thread, and on mobile it looks like a browser warning — which made deleting
 * a post or a skill group read as a site error.
 */
export const useAdminConfirm = () => {
  const request = useState<ConfirmRequest | null>('admin:confirm', () => null)

  function ask(opts: Partial<ConfirmRequest> & { title: string }): Promise<boolean> {
    // A second request on top of the first would leave the earlier promise hanging.
    close(false)
    request.value = {
      text:   '',
      action: 'Delete',
      danger: true,
      ...opts,
    }
    return new Promise<boolean>((r) => { resolve = r })
  }

  function close(ok: boolean) {
    request.value = null
    resolve?.(ok)
    resolve = null
  }

  return { request, ask, confirm: () => close(true), cancel: () => close(false) }
}
