import { describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({ messages: {} as Record<string, string> }))
mockNuxtImport('useLocale', () => () => ({ t: (key: string) => state.messages[key] ?? key }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)

describe('Политика конфиденциальности', () => {
  test.each(['ru', 'en'])('раздел Метрики отображается в локали %s', async (locale) => {
    const { readFile } = await import('node:fs/promises')
    const messages = JSON.parse(await readFile(`${process.cwd()}/i18n/locales/${locale}.json`, 'utf8'))
    state.messages = Object.fromEntries(Object.entries(messages.privacy).map(([key, value]) => [`privacy.${key}`, value])) as Record<string, string>
    const { default: Privacy } = await import('~/pages/privacy/index.vue')
    const wrapper = await mountSuspended(Privacy)
    expect(wrapper.findAll('section')).toHaveLength(9)
    expect(wrapper.text()).toContain(messages.privacy.s9_title)
    expect(wrapper.text()).toContain(messages.privacy.s9_text)
    expect(wrapper.text()).not.toContain('privacy.s9_')
    wrapper.unmount()
  })
})
