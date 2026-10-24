import { describe, test, expect } from 'vitest'

const valid = { name: 'Ivan', email: 'ivan@example.com', message: 'Hello, a project for you', consent: true }

describe('contactValidators', () => {
  test('a name of exactly two characters passes, one does not', async () => {
    const { contactValidators } = await import('~~/shared/utils/contact')
    expect(contactValidators.name('Al')).toBe(true)
    expect(contactValidators.name(' A ')).toBe(false)
  })

  test('the message is checked against both bounds', async () => {
    const { contactValidators } = await import('~~/shared/utils/contact')
    expect(contactValidators.message('x'.repeat(10))).toBe(true)
    expect(contactValidators.message('x'.repeat(9))).toBe(false)
    expect(contactValidators.message('x'.repeat(5000))).toBe(true)
    expect(contactValidators.message('x'.repeat(5001))).toBe(false)
  })

  test('an address without a domain is not an email', async () => {
    const { contactValidators } = await import('~~/shared/utils/contact')
    expect(contactValidators.email('ivan@example.com')).toBe(true)
    expect(contactValidators.email('ivan@example')).toBe(false)
    expect(contactValidators.email('')).toBe(false)
  })
})

describe('parseContact', () => {
  test('a valid body comes back trimmed and without extra fields', async () => {
    const { parseContact } = await import('~~/shared/utils/contact')
    expect(parseContact({ ...valid, name: '  Ivan  ', website: '' }))
      .toEqual({ name: 'Ivan', email: 'ivan@example.com', message: 'Hello, a project for you' })
  })

  test('without consent the message is refused', async () => {
    const { parseContact } = await import('~~/shared/utils/contact')
    expect(parseContact({ ...valid, consent: false })).toBeNull()
    expect(parseContact({ ...valid, consent: 'true' })).toBeNull()
  })

  test('a non-string field is refused instead of crashing the handler', async () => {
    const { parseContact } = await import('~~/shared/utils/contact')
    expect(parseContact({ ...valid, name: ['Ivan'] })).toBeNull()
    expect(parseContact({ ...valid, message: 42 })).toBeNull()
  })

  test('an empty or missing body is refused', async () => {
    const { parseContact } = await import('~~/shared/utils/contact')
    expect(parseContact(undefined)).toBeNull()
    expect(parseContact(null)).toBeNull()
    expect(parseContact({})).toBeNull()
  })
})
