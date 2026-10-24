/**
 * Whether a navigation item matches the current path. The locale prefix is
 * dropped first, and "home" matches only the root — otherwise it would light up
 * on every page.
 */
export function isNavActive(key: string, path: string): boolean {
  const bare = path.replace(/^\/(ru|en)(?=\/|$)/, '') || '/'
  return key === 'home' ? bare === '/' : bare.startsWith(`/${key}`)
}
