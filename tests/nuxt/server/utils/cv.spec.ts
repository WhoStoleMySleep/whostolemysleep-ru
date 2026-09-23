import { describe, test, expect, vi, beforeEach } from 'vitest'

const dbState = vi.hoisted(() => ({
  about:      null as { id: number; text_ru: string; text_en: string } | null,
  experience: [] as Record<string, unknown>[],
  education:  [] as Record<string, unknown>[],
  skills:     [] as Record<string, unknown>[],
}))

vi.mock('~~/server/db', () => ({
  db: {
    query: {
      aboutMe:    { findFirst: async () => dbState.about ?? undefined },
      experience: { findMany:  async () => dbState.experience },
      education:  { findMany:  async () => dbState.education },
      skillGroup: { findMany:  async () => dbState.skills },
    },
  },
}))

beforeEach(() => {
  dbState.about      = null
  dbState.experience = []
  dbState.education  = []
  dbState.skills     = []
})

describe('parseSnapshot', () => {
  test('parses a complete file', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      about: { text_ru: ' about me ', text_en: 'about' },
      experience: [{
        company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: 'Developer',
        date_from: '2020-01-01', date_to: null,
        bullets: [{ text_ru: 'did things', text_en: 'did' }],
      }],
      education: [{ institution: 'University', specialization_ru: 'Software', specialization_en: 'SE', date_from: '2015-09-01', date_to: '2019-06-30' }],
      skills: [{ slug: 'lang', name_ru: 'Languages', name_en: 'Languages', items: ['TypeScript', 'Rust'] }],
    })

    expect(out.about).toEqual({ text_ru: 'about me', text_en: 'about' })
    expect(out.experience).toHaveLength(1)
    expect(out.education?.[0]?.date_to).toBe('2019-06-30')
    expect(out.skills?.[0]?.items).toEqual(['TypeScript', 'Rust'])
  })

  test('a non-object is an error: there is nothing to parse', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(() => parseSnapshot(null)).toThrow()
    expect(() => parseSnapshot('text')).toThrow()
    expect(() => parseSnapshot(42)).toThrow()
  })

  test('a missing section is left out of the result — that means leave alone, not delete everything', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ about: { text_ru: 'a', text_en: 'b' } })
    expect(out).not.toHaveProperty('experience')
    expect(out).not.toHaveProperty('skills')
  })

  test('an empty section stays an empty array — that one does mean delete everything', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(parseSnapshot({ experience: [] }).experience).toEqual([])
  })

  test('a row with no company or a broken date is dropped, the rest pass', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [
        { company_ru: '', date_from: '2020-01-01' },
        { company_ru: 'Acme', date_from: '01.01.2020' },
        { company_ru: 'Beta', date_from: '2021-03-01' },
      ],
    })
    expect(out.experience).toHaveLength(1)
    expect(out.experience?.[0]?.company_ru).toBe('Beta')
  })

  test('a file exported before the company name became bilingual still imports', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      version: 1,
      experience: [{ company: 'Acme', position_ru: 'Developer', date_from: '2020-01-01' }],
    })
    expect(out.experience?.[0]).toMatchObject({ company_ru: 'Acme', company_en: '' })
  })

  test('an unfilled end date means to this day, not an error', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ experience: [{ company_ru: 'Acme', date_from: '2020-01-01', date_to: 'now' }] })
    expect(out.experience?.[0]?.date_to).toBeNull()
  })

  test('a bullet as a string instead of an object is a common way to write it by hand', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [{ company_ru: 'Acme', date_from: '2020-01-01', bullets: [' brought a service up '] }],
    })
    expect(out.experience?.[0]?.bullets).toEqual([{ text_ru: 'brought a service up', text_en: '' }])
  })

  test('empty bullets are dropped, and bullets that are not an array are just an empty list', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [
        { company_ru: 'Acme', date_from: '2020-01-01', bullets: ['', { text_ru: '', text_en: '' }, 'ok'] },
        { company_ru: 'Beta', date_from: '2020-01-01', bullets: 'a string' },
      ],
    })
    expect(out.experience?.[0]?.bullets).toHaveLength(1)
    expect(out.experience?.[1]?.bullets).toEqual([])
  })

  test('a skill group with no slug is dropped — there is nothing to key it by', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ skills: [{ name_ru: 'Languages', items: ['Rust'] }] })
    expect(out.skills).toEqual([])
  })

  test('non-string skills inside a group are filtered out', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ skills: [{ slug: 'lang', items: ['Rust', 42, null, '  '] }] })
    expect(out.skills?.[0]?.items).toEqual(['Rust'])
  })
})

describe('diffSnapshot', () => {
  test('empty input gives no changes', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    expect(await diffSnapshot({})).toEqual([])
  })

  test('an identical about text does not count as a change', async () => {
    dbState.about = { id: 1, text_ru: 'about me', text_en: 'about' }
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ about: { text_ru: 'about me', text_en: 'about' } })
    expect(out).toEqual([])
  })

  test('an edit to about shows per field and is marked editable', async () => {
    dbState.about = { id: 1, text_ru: 'the old text', text_en: 'old' }
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ about: { text_ru: 'the new text', text_en: 'old' } })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'about', kind: 'update', field: 'text_ru', before: 'the old text', after: 'the new text', editable: true })
  })

  test('an unknown job is an add', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{ company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: '', date_from: '2020-01-01', date_to: null, bullets: [] }],
    })
    expect(out.map((b) => b.change.kind)).toEqual(['add'])
  })

  test('a row is matched by the Russian company name and start date, case and spaces do not matter', async () => {
    dbState.experience = [{
      id: 7, order: 0, company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: '',
      date_from: '2020-01-01', date_to: null, bullets: [],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{ company_ru: ' ACME ', company_en: '', position_ru: 'Developer', position_en: '', date_from: '2020-01-01', date_to: null, bullets: [] }],
    })

    expect(out.map((b) => b.change.kind)).toEqual(['update'])
    expect(out[0]?.targetId).toBe(7)
    expect(out[0]?.change.field).toBe('company_ru')
  })

  test('a job that vanished from the file is a remove', async () => {
    dbState.experience = [{
      id: 7, order: 0, company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: '',
      date_from: '2020-01-01', date_to: null, bullets: [],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ experience: [] })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'experience', kind: 'remove' })
    expect(out[0]?.targetId).toBe(7)
  })

  test('bullets are compared as a whole list — a reorder is a change too', async () => {
    dbState.experience = [{
      id: 7, order: 0, company_ru: 'Acme', company_en: '', position_ru: 'D', position_en: '',
      date_from: '2020-01-01', date_to: null,
      bullets: [{ text_ru: 'one', text_en: '' }, { text_ru: 'two', text_en: '' }],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{
        company_ru: 'Acme', company_en: '', position_ru: 'D', position_en: '', date_from: '2020-01-01', date_to: null,
        bullets: [{ text_ru: 'two', text_en: '' }, { text_ru: 'one', text_en: '' }],
      }],
    })

    expect(out).toHaveLength(1)
    expect(out[0]?.change.field).toBe('bullets')
    expect(out[0]?.change.editable).toBe(false)
  })

  test('the contents of a skill group change as a single change', async () => {
    dbState.skills = [{ id: 3, order: 0, slug: 'lang', name_ru: 'Languages', name_en: 'Languages', skills: [{ name: 'Rust' }] }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      skills: [{ slug: 'lang', name_ru: 'Languages', name_en: 'Languages', items: ['Rust', 'TypeScript'] }],
    })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'skills', field: 'items', after: ['Rust', 'TypeScript'] })
  })

  test('a section missing from the file produces no removals', async () => {
    dbState.education = [{
      id: 2, order: 0, institution: 'University', specialization_ru: 'Software', specialization_en: '',
      date_from: '2015-09-01', date_to: null,
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    expect(await diffSnapshot({ about: { text_ru: '', text_en: '' } })).toHaveLength(0)
  })
})
