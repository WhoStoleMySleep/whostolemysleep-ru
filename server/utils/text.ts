/**
 * Markdown-ish stored text as plain prose: a description line in a feed or a
 * digest has to read as a sentence, not as source. Stops at `limit` characters
 * on a word boundary, adding an ellipsis only when something was actually cut.
 */
export function plainText(text: string, limit = 155): string {
  const clean = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links to their text
    .replace(/<[^>]+>/g, ' ')                  // tags, for text stored as html
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (clean.length <= limit) return clean
  return `${clean.slice(0, limit).replace(/[\s,.;:—-]+$/, '')}…`
}

/** The five characters that cannot stand as themselves inside XML. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
