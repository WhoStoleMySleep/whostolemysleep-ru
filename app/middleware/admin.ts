export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/admin/login') return

  // The result of the check survives the server-to-client handover in the payload,
  // so navigating around the panel no longer costs a network request. An expired
  // session is caught by the first API call: it answers 401.
  const authed = useState('admin:authed', () => false)
  if (authed.value) return

  try {
    // useRequestFetch, not $fetch. On the server — on a page reload or a direct
    // link — $fetch does not forward the browser's cookies, and /api/admin/me
    // answered 401. That threw the panel back to the login form on every F5,
    // with the session still alive.
    await useRequestFetch()('/api/admin/me')
    authed.value = true
  } catch {
    return navigateTo('/admin/login')
  }
})
