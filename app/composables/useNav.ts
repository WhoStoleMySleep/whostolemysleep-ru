/**
 * Единый источник пунктов навигации.
 * Используется боковым рейлом в лейауте, шапкой и мобильным меню —
 * чтобы список не расходился по трём местам.
 */
export const useNav = () => {
  const { t } = useLocale()
  const localePath = useLocalePath()

  return computed(() => [
    { key: 'home',     num: '00', label: t('nav.home'),     to: localePath('/') },
    { key: 'blog',     num: '01', label: t('nav.blog'),     to: localePath('/blog') },
    { key: 'projects', num: '02', label: t('nav.projects'), to: localePath('/projects') },
    { key: 'resume',   num: '03', label: t('nav.resume'),   to: localePath('/resume') },
    { key: 'contacts', num: '04', label: t('nav.contacts'), to: localePath('/contacts') },
  ])
}
