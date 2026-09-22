import { marked } from 'marked'
import { sanitizeHtml } from './sanitize'

/**
 * Markdown from the publisher into the HTML the site stores.
 * The result always goes through the same sanitizer as text written in the admin panel.
 */
export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false })
  return sanitizeHtml(html as string)
}

/** An excerpt derived from the rendered HTML, when none was supplied. */
export function excerptFromHtml(html: string, limit = 200): string {
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= limit) return plain

  const cut = plain.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`
}
