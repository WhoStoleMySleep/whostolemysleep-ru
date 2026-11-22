import type { MaybeRefOrGetter } from 'vue'
import type { ExperiencePeriod } from '~~/shared/utils/experience'

/** SSR-дата хранится в payload, чтобы стаж не менялся между HTML и гидрацией. */
export function useExperience(periods: MaybeRefOrGetter<readonly ExperiencePeriod[] | null | undefined>) {
  const { locale } = useLocale()
  const today = useState('experience-today', () => new Date().toISOString().slice(0, 10))
  const now = computed(() => Date.parse(`${today.value}T00:00:00Z`))
  const months = computed(() => experienceMonths(toValue(periods) ?? [], now.value))
  const total = computed(() => formatExperience(months.value, locale.value))
  const duration = (period: ExperiencePeriod) => formatExperience(experienceMonths([period], now.value), locale.value)
  return { total, duration }
}
