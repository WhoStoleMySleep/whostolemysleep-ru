import { describe, test, expect } from 'vitest'

describe('markdownToHtml', () => {
  test('turns markup into html', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('# Heading')).toContain('Heading')
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>')
  })

  test('strips a script out of the markdown that was sent', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    const html = markdownToHtml('body\n\n<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('body')
  })

  test('a single line break does not become a <br> — breaks is off', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('first\nsecond')).not.toContain('<br')
  })

  test('empty input gives an empty string', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('')).toBe('')
  })
})

describe('excerptFromHtml', () => {
  test('strips tags and extra spaces', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>First</p>\n<p>  Second  </p>')).toBe('First Second')
  })

  test('&nbsp; becomes a plain space', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>a&nbsp;b</p>')).toBe('a b')
  })

  test('text exactly at the limit is not cut and gets no ellipsis', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    const text = 'a'.repeat(10)
    expect(excerptFromHtml(`<p>${text}</p>`, 10)).toBe(text)
  })

  test('long text is cut at the last space, not in the middle of a word', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>one two three</p>', 9)).toBe('one two…')
  })

  test('a word longer than the limit is cut as is — there is nowhere else to cut', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>mmmmmmmmmmm</p>', 5)).toBe('mmmmm…')
  })

  test('empty html gives an empty excerpt', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('')).toBe('')
  })
})
