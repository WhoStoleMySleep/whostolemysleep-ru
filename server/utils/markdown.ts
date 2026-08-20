import { marked } from 'marked'
import { sanitizeHtml } from './sanitize'

/**
 * Markdown из публикатора в HTML, который хранит сайт.
 * Результат обязательно прогоняется через тот же санитайзер, что и текст из админки.
 */
export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: false })
  return sanitizeHtml(html as string)
}

/** Анонс из готового HTML — если своего анонса не прислали. */
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
