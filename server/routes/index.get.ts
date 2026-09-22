const CIS_CODES = ['ru', 'uk', 'be', 'kk']

defineRouteMeta({
  openAPI: {
    tags:        ['Service'],
    summary:     'Site root',
    description: 'Redirect to a locale: the stored cookie, otherwise the language from accept-language.',
    responses: {
      302: { description: 'Redirect to /ru or /en' },
    },
  },
})

export default defineEventHandler((event) => {
  const saved = getCookie(event, 'locale')
  if (saved === 'ru' || saved === 'en') {
    return sendRedirect(event, `/${saved}`, 302)
  }

  const accept = getHeader(event, 'accept-language') ?? ''
  const langs = accept.toLowerCase().split(',').map((l) => l.trim().split(/[-;]/)[0] ?? '')
  const locale = langs.some((code) => CIS_CODES.includes(code)) ? 'ru' : 'en'

  setCookie(event, 'locale', locale, { maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax' })
  return sendRedirect(event, `/${locale}`, 302)
})
