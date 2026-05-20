import sanitize from 'sanitize-html'

const OPTIONS: sanitize.IOptions = {
  allowedTags: [
    ...sanitize.defaults.allowedTags,
    'img', 'h2', 'h3', 'figure', 'figcaption',
  ],
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    '*':   ['class', 'id'],
    'img': ['src', 'alt', 'width', 'height', 'loading'],
    'a':   ['href', 'target', 'rel'],
  },
  allowedSchemes: ['https', 'http', 'mailto'],
  transformTags: {
    a: (_, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, rel: 'noopener noreferrer' },
    }),
  },
}

export function sanitizeHtml(html: string): string {
  return sanitize(html, OPTIONS)
}
