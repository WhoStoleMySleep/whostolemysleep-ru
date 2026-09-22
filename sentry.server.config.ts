import * as Sentry from '@sentry/nuxt'

/**
 * Nitro-side reporting.
 *
 * This file runs before Nitro exists, so `useRuntimeConfig()` is unavailable and
 * the DSN comes straight from the environment. It is the same variable the client
 * reads through `runtimeConfig.public` — one value to set, not two to keep in sync.
 */
Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,
  sendDefaultPii: false,

  /**
   * Second line of defence over `sendDefaultPii`.
   *
   * A 500 thrown inside the login handler carries the request that caused it:
   * the body holds the admin password in clear text and the headers hold the
   * session cookie. Both are stripped before the event leaves the process, so
   * a Sentry breach cannot become an admin-panel breach.
   */
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies
      delete event.request.data
      if (event.request.headers) {
        delete event.request.headers.cookie
        delete event.request.headers.authorization
      }
    }
    return event
  },
})
