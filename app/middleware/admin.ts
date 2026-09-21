export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return

  // Результат проверки переживает переход с сервера на клиент через
  // payload, поэтому на каждую навигацию по админке сетевой запрос
  // больше не уходит. Протухшую сессию поймает первый же запрос к API:
  // он ответит 401.
  const authed = useState('admin:authed', () => false)
  if (authed.value) return

  try {
    // useRequestFetch, а не $fetch. На сервере — при перезагрузке страницы
    // или заходе по прямой ссылке — $fetch не передаёт куки браузера, и
    // /api/admin/me отвечал 401. Из-за этого из админки выбрасывало на
    // логин при каждом F5, хотя сессия была жива.
    await useRequestFetch()('/api/admin/me')
    authed.value = true
  } catch {
    return navigateTo('/admin/login')
  }
})
