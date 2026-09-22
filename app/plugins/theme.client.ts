/**
 * Brings the theme state in line with what the critical inline script from
 * nuxt.config has already applied (it sets the .light class before the first
 * paint so there is no flash).
 *
 * The call is deferred to app:mounted on purpose. Changing isDark any earlier
 * lets the client render a different icon and aria-label than the server sent,
 * and hydration fails with a mismatch — PageSpeed caught exactly that.
 * The icon itself does not depend on the state; CSS picks it by the .light class.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    useTheme().init()
  })
})
