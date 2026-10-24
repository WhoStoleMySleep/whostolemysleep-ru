export interface ContactMessage {
  name:    string
  email:   string
  message: string
}

/** Upper bounds keep a scripted request from mailing a novel. */
const LIMITS = {
  name:    { min: 2,  max: 200 },
  email:   { min: 3,  max: 320 },
  message: { min: 10, max: 5000 },
} as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fits(value: string, { min, max }: { min: number, max: number }): boolean {
  const length = value.trim().length
  return length >= min && length <= max
}

/**
 * Field rules shared by the form and the endpoint: the form is not the only
 * client that can post to /api/contact.
 */
export const contactValidators = {
  name:    (v: string) => fits(v, LIMITS.name),
  email:   (v: string) => fits(v, LIMITS.email) && EMAIL_RE.test(v.trim()),
  message: (v: string) => fits(v, LIMITS.message),
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

/** A trimmed message when the body is valid and consent was given, null otherwise. */
export function parseContact(body: unknown): ContactMessage | null {
  const { name, email, message, consent } = (body ?? {}) as Record<string, unknown>
  if (!isText(name) || !isText(email) || !isText(message) || consent !== true) return null

  const valid = contactValidators.name(name)
    && contactValidators.email(email)
    && contactValidators.message(message)
  if (!valid) return null

  return { name: name.trim(), email: email.trim(), message: message.trim() }
}
