import { describe, test, expect } from 'vitest'

describe('sanitizeHtml', () => {
  test('it keeps the allowed article markup', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    const html = '<h2>Section</h2><figure><img src="https://a.test/i.png" alt="i" /><figcaption>caption</figcaption></figure>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  test('it strips a script together with its contents', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>')
  })

  test('it removes event handlers from the allowed tags', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<p onclick="alert(1)">a</p>')).toBe('<p>a</p>')
  })

  test('javascript: in a link does not survive the scheme check', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
  })

  test('every link gets a rel that protects against window.opener', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('<a href="https://a.test">x</a>')).toContain('rel="noopener noreferrer"')
  })

  test('an existing rel is overwritten, not appended to', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    const out = sanitizeHtml('<a href="https://a.test" rel="dofollow">x</a>')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).not.toContain('dofollow')
  })

  test('an empty string passes straight through', async () => {
    const { sanitizeHtml } = await import('~~/server/utils/sanitize')
    expect(sanitizeHtml('')).toBe('')
  })
})
