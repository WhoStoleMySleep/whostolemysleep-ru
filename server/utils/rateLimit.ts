type RateEntry = { count: number; resetAt: number }

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const storage = useStorage('cache')
  const now = Date.now()
  const entry = await storage.getItem<RateEntry>(`rate:${key}`)

  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) return false
    await storage.setItem(`rate:${key}`, { count: entry.count + 1, resetAt: entry.resetAt })
    return true
  }

  await storage.setItem(`rate:${key}`, { count: 1, resetAt: now + windowMs })
  return true
}
