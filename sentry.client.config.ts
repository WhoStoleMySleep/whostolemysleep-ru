import * as Sentry from '@sentry/nuxt'
import { useRuntimeConfig } from '#imports'

/**
 * Browser-side reporting.
 *
 * The DSN is public by design — it ends up in the bundle either way — but it
 * lives in the environment so a fork or a preview deployment does not report
 * into this project's quota.
 */
Sentry.init({
  dsn: useRuntimeConfig().public.sentry.dsn,

  // Local runs would otherwise burn the monthly error budget on code that is
  // being edited at that very moment.
  enabled: !import.meta.dev,

  environment: import.meta.dev ? 'development' : 'production',

  // Errors are what this is for. Traces are sampled low: the free plan's span
  // budget is finite, and a personal site has no latency mystery worth 100%.
  tracesSampleRate: 0.1,

  // No IP addresses, no cookies, no form values. The admin panel posts a
  // password, and a crash report is not a place for it.
  sendDefaultPii: false,
})
