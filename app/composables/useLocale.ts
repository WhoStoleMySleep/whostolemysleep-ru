import type { Locale } from '~/types'

const FADE_MS = 320
const DAYS_PER_YEAR = 365
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const RUSSIAN_TEENS_MIN = 11
const RUSSIAN_TEENS_MAX = 19
const RUSSIAN_FEW_MAX = 4
const LOCALE_COOKIE_MAX_AGE = DAYS_PER_YEAR * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE

/** Locale switching with a fade over the navigation, plus strings that need Russian plural rules. */
export function useLocale() {
  const { locale: rawLocale, t } = useI18n()
  const switchLocalePath = useSwitchLocalePath()
  const locale = computed(() => rawLocale.value as Locale)

  async function setLocale(l: Locale) {
    const isFading = useState('lang-fade', () => false)
    // A second click mid-fade would start a second navigation on top of the first.
    if (isFading.value) return

    isFading.value = true
    // finally: a failed navigation must not leave the page faded out and every
    // further click ignored by the guard above.
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, FADE_MS))

      useCookie('locale', { maxAge: LOCALE_COOKIE_MAX_AGE, path: '/', sameSite: 'lax' }).value = l
      await navigateTo(switchLocalePath(l))

      await nextTick()
      await nextTick()
    } finally {
      isFading.value = false
    }
  }

  function postCount(n: number): string {
    if (locale.value === 'en') return `${n} ${n === 1 ? 'post' : 'posts'}`
    const mod10  = n % 10
    const mod100 = n % 100
    if (mod100 >= RUSSIAN_TEENS_MIN && mod100 <= RUSSIAN_TEENS_MAX) return `${n} записей`
    if (mod10 === 1)                   return `${n} запись`
    if (mod10 >= 2 && mod10 <= RUSSIAN_FEW_MAX) return `${n} записи`
    return `${n} записей`
  }

  return { locale, setLocale, t, postCount }
}
