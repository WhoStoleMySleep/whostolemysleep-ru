interface ConfirmRequest {
  title: string
  text:  string
  /** Подпись на кнопке подтверждения. */
  action: string
  danger: boolean
}

let resolve: ((ok: boolean) => void) | null = null

/**
 * Замена window.confirm. Нативный диалог нельзя оформить, он блокирует
 * поток и на мобильных выглядит как предупреждение браузера — из-за чего
 * удаление постов и групп навыков читалось как ошибка сайта.
 */
export const useAdminConfirm = () => {
  const request = useState<ConfirmRequest | null>('admin:confirm', () => null)

  function ask(opts: Partial<ConfirmRequest> & { title: string }): Promise<boolean> {
    // Второй запрос поверх первого оставил бы висеть чужой промис.
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
