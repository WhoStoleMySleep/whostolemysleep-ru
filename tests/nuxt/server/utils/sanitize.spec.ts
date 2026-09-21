import { describe, test, expect } from 'vitest'

describe('sanitizeHtml', () => {
  test('оставляет разрешённую разметку статьи', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    const html = '<h2>Раздел</h2><figure><img src="https://a.test/i.png" alt="и" /><figcaption>подпись</figcaption></figure>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  test('вырезает скрипт вместе с содержимым', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>')
  })

  test('снимает обработчики событий с разрешённых тегов', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<p onclick="alert(1)">a</p>')).toBe('<p>a</p>')
  })

  test('javascript: в ссылке не проходит схему', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
  })

  test('любой ссылке проставляется rel против window.opener', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<a href="https://a.test">x</a>')).toContain('rel="noopener noreferrer"')
  })

  test('чужой rel перезаписывается, а не дополняется', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    const out = sanitizeHtml('<a href="https://a.test" rel="dofollow">x</a>')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain('dofollow')
  })

  test('пустая строка проходит насквозь', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('')).toBe('')
  })
})
