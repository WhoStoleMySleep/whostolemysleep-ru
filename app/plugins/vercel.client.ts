import { inject } from '@vercel/analytics'

/** Analytics only: Speed Insights is injected by its own module in nuxt.config. */
export default defineNuxtPlugin(() => {
  inject()
})
