import type { Locale } from '~/types'

const FADE_MS = 320

export function useLocale() {
  const { locale: rawLocale, t } = useI18n()
  const switchLocalePath = useSwitchLocalePath()
  const locale = computed(() => rawLocale.value as Locale)

  async function setLocale(l: Locale) {
    const isFading = useState('lang-fade', () => false)

    isFading.value = true
    await new Promise<void>((resolve) => setTimeout(resolve, FADE_MS))

    useCookie('locale', { maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax' }).value = l
    await navigateTo(switchLocalePath(l))

    await nextTick()
    isFading.value = false
  }

  function postCount(n: number): string {
    if (locale.value === 'en') return `${n} ${n === 1 ? 'post' : 'posts'}`
    const mod10  = n % 10
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 19) return `${n} записей`
    if (mod10 === 1)                   return `${n} запись`
    if (mod10 >= 2 && mod10 <= 4)      return `${n} записи`
    return `${n} записей`
  }

  return { locale, setLocale, t, postCount }
}
