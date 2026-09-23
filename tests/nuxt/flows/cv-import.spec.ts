import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { CvChange, CvSnapshot } from '~~/server/utils/cv'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const event = {} as H3Event

/** Replaces the Nitro server auto-imports, which the test environment does not have. */
function nitro(body?: unknown) {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => body)
}

async function handler(path: string, body?: unknown) {
  nitro(body)
  const mod = await import(/* @vite-ignore */ path)
  return (mod.default as (e: H3Event) => Promise<unknown>)(event)
}

const exportCv = () => handler('~~/server/api/admin/cv/index.get') as Promise<CvSnapshot>
const diff     = (snapshot: unknown) => handler('~~/server/api/admin/cv/diff.post', { snapshot }) as Promise<{ changes: CvChange[] }>
const apply    = (body: unknown) => handler('~~/server/api/admin/cv/apply.post', body) as Promise<{ applied: number, skipped?: number }>

const current = {
  aboutMe:    [{ id: 1, text_ru: 'the old text', text_en: '' }],
  experience: [{
    id: 10, company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: '',
    date_from: '2020-01-01', date_to: null, order: 0,
    bullets: [{ id: 100, text_ru: 'did things', text_en: '', order: 0 }],
  }],
  education:  [] as unknown[],
  skillGroup: [{ id: 20, slug: 'lang', name_ru: 'Languages', name_en: '', order: 0, skills: [{ id: 200, name: 'TypeScript', order: 0 }] }],
}

/** The edited file: an edited text, a promotion, a new university, a new skill. */
const uploaded = {
  version: 2,
  about: { text_ru: 'the new text', text_en: '' },
  experience: [{
    company_ru: 'Acme', company_en: '', position_ru: 'Senior developer', position_en: '',
    date_from: '2020-01-01', date_to: null,
    bullets: [{ text_ru: 'did things', text_en: '' }],
  }],
  education: [{ institution: 'University', specialization_ru: 'Software', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30' }],
  skills: [{ slug: 'lang', name_ru: 'Languages', name_en: '', items: ['TypeScript', 'Rust'] }],
}

const keys = () => state.calls.map((c) => `${c.op}:${c.table}`)

beforeEach(() => {
  plan(state, {
    'insert:experience': [[{ id: 11 }]],
    'insert:skill_group': [[{ id: 21 }]],
  }, current)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CV import: export → diff → apply', () => {
  test('an exported file loaded back gives no changes', async () => {
    const snapshot = await exportCv()
    expect(snapshot.version).toBe(2)

    const { changes } = await diff(snapshot)
    expect(changes).toEqual([])
  })

  test('the diff shows every edit and writes nothing', async () => {
    const { changes } = await diff(uploaded)

    expect(changes.map((c) => c.id)).toEqual([
      'about:text_ru',
      'experience:10:position_ru',
      'education:add:0',
      'skills:20:items',
    ])
    expect(changes.find((c) => c.id === 'about:text_ru')).toMatchObject({ before: 'the old text', after: 'the new text', editable: true })
    expect(state.calls.every((c) => c.op === 'select')).toBe(true)
  })

  test('only what was accepted is applied', async () => {
    const out = await apply({ snapshot: uploaded, accept: ['about:text_ru'] })

    expect(out).toEqual({ applied: 1, skipped: 0 })
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:about_me', 'set')?.text_ru).toBe('the new text')
    expect(keys()).not.toContain('insert:education')
    expect(keys()).not.toContain('update:experience')
  })

  test('an accepted addition goes to the end of the list', async () => {
    await apply({ snapshot: uploaded, accept: ['education:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:education', 'values')).toMatchObject({
      institution: 'University',
      date_to:     '2019-06-30',
      order:       0,
    })
  })

  test('a skill list is rewritten as a whole', async () => {
    await apply({ snapshot: uploaded, accept: ['skills:20:items'] })

    expect(keys().indexOf('delete:skill')).toBeLessThan(keys().indexOf('insert:skill'))
    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([
      { group_id: 20, name: 'TypeScript', order: 0 },
      { group_id: 20, name: 'Rust', order: 1 },
    ])
  })

  test('a value edited in the list replaces the value from the file', async () => {
    await apply({ snapshot: uploaded, accept: ['about:text_ru'], overrides: { 'about:text_ru': 'fixed up by hand' } })

    expect(stepArg<Record<string, unknown>>(state.calls, 'update:about_me', 'set')?.text_ru).toBe('fixed up by hand')
  })

  test('overriding a list is ignored — there is nothing to edit there', async () => {
    await apply({ snapshot: uploaded, accept: ['skills:20:items'], overrides: { 'skills:20:items': 'nonsense' } })

    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([
      { group_id: 20, name: 'TypeScript', order: 0 },
      { group_id: 20, name: 'Rust', order: 1 },
    ])
  })

  test('an unknown id counts as dropped, it is not applied at random', async () => {
    const out = await apply({ snapshot: uploaded, accept: ['about:text_ru', 'experience:999:company_ru'] })

    expect(out).toEqual({ applied: 1, skipped: 1 })
  })

  test('with nothing accepted nothing is written', async () => {
    const out = await apply({ snapshot: uploaded, accept: [] })

    expect(out).toEqual({ applied: 0 })
    expect(state.calls).toHaveLength(0)
  })

  test('applying queues the CV pages for cache invalidation', async () => {
    await apply({ snapshot: uploaded, accept: ['about:text_ru'] })

    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual([
      { path: '/' }, { path: '/resume' }, { path: '/cv' },
    ])
  })

  test('a section missing from the file does not delete that section rows', async () => {
    const { changes } = await diff({ about: { text_ru: 'the new text', text_en: '' } })

    expect(changes.map((c) => c.id)).toEqual(['about:text_ru'])
  })

  test('a file that cannot be parsed is a 400 before the database is read', async () => {
    await expect(diff('this is not a snapshot')).rejects.toThrow(/JSON object/)
  })
})

describe('CV import: additions and removals', () => {
  test('a row missing from the file is offered for removal', async () => {
    const { changes } = await diff({ experience: [], education: [], skills: [] })

    expect(changes.map((c) => c.id)).toEqual(['experience:remove:10', 'skills:remove:20'])

    await apply({ snapshot: { experience: [], skills: [] }, accept: ['experience:remove:10', 'skills:remove:20'] })
    expect(keys()).toContain('delete:experience')
    expect(keys()).toContain('delete:skill_group')
  })

  test('a new job is created together with its bullets and goes to the end of the list', async () => {
    const snapshot = {
      experience: [{
        company_ru: 'Newco', position_ru: 'Engineer', position_en: '',
        date_from: '2024-01-01', date_to: null,
        bullets: [{ text_ru: 'first', text_en: '' }, { text_ru: 'second', text_en: '' }],
      }],
    }

    await apply({ snapshot, accept: ['experience:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:experience', 'values')).toMatchObject({ company_ru: 'Newco', order: 1 })
    expect(stepArg(state.calls, 'insert:experience_bullet', 'values')).toEqual([
      { experience_id: 11, text_ru: 'first', text_en: '', order: 0 },
      { experience_id: 11, text_ru: 'second', text_en: '', order: 1 },
    ])
  })

  test('a new skill group is created with its own skills', async () => {
    const snapshot = { skills: [{ slug: 'tools', name_ru: 'Tools', name_en: '', items: ['Docker'] }] }

    await apply({ snapshot, accept: ['skills:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:skill_group', 'values')).toMatchObject({ slug: 'tools', order: 1 })
    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([{ group_id: 21, name: 'Docker', order: 0 }])
  })

  test('an edited education field goes out as a single update', async () => {
    plan(state, {}, {
      ...current,
      education: [{ id: 30, institution: 'University', specialization_ru: 'Software', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30', order: 0 }],
    })

    const snapshot = { education: [{ institution: 'University', specialization_ru: 'Software engineering', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30' }] }
    const { changes } = await diff(snapshot)
    expect(changes.map((c) => c.id)).toEqual(['education:30:specialization_ru'])

    await apply({ snapshot, accept: ['education:30:specialization_ru'] })
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:education', 'set')?.specialization_ru).toBe('Software engineering')
  })
})
