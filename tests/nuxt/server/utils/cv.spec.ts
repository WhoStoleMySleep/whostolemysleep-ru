import { describe, test, expect, vi, beforeEach } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { CvBound, CvChange, CvEducation, CvExperience, CvSkillGroup } from '~~/server/utils/cv'

const sqlState = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const sqlFailure = vi.hoisted(() => ({ operation: undefined as string | undefined }))

const dbState = vi.hoisted(() => ({
  about:      null as { id: number; text_ru: string; text_en: string } | null,
  experience: [] as Record<string, unknown>[],
  education:  [] as Record<string, unknown>[],
  skills:     [] as Record<string, unknown>[],
}))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  const writes = makeFakeDb(sqlState) as Record<string, unknown>
  return { db: new Proxy(writes, {
    get(target, operation) {
      if (operation === sqlFailure.operation) throw new Error('SQL failed')
      if (operation !== 'query') return Reflect.get(target, operation)
      return {
        aboutMe: { findFirst: async () => dbState.about ?? undefined },
        experience: { findMany: async () => dbState.experience },
        education: { findMany: async () => dbState.education },
        skillGroup: { findMany: async () => dbState.skills },
      }
    },
  }) }
})

beforeEach(() => {
  dbState.about      = null
  dbState.experience = []
  dbState.education  = []
  dbState.skills     = []
  sqlFailure.operation = undefined
  plan(sqlState, { 'insert:experience': [[{ id: 11 }]], 'insert:skill_group': [[{ id: 21 }]] })
})

function experience(overrides: Partial<CvExperience> = {}): CvExperience {
  return {
    company_ru: 'Acme', company_en: '', position_ru: 'Developer', position_en: '',
    date_from: '2020-01-01', date_to: null, bullets: [], ...overrides,
  }
}

function education(overrides: Partial<CvEducation> = {}): CvEducation {
  return {
    institution: 'University', specialization_ru: 'Software', specialization_en: '',
    date_from: '2015-09-01', date_to: null, ...overrides,
  }
}

function skills(overrides: Partial<CvSkillGroup> = {}): CvSkillGroup {
  return { slug: 'lang', name_ru: 'Languages', name_en: '', items: [], ...overrides }
}

function selectedChange(
  change: Partial<CvChange> & Pick<CvChange, 'section' | 'kind'>,
  binding: Pick<CvBound, 'targetId' | 'record'> = {},
): CvBound {
  return {
    change: { id: 'selected', label: 'Selected', before: null, after: null, editable: false, ...change },
    ...binding,
  }
}

const writes = () => sqlState.calls.map((call) => `${call.op}:${call.table}`)

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

describe('Экспорт резюме', () => {
  test('возвращает пустой снимок, если данных ещё нет', async () => {
    const { buildSnapshot } = await import('~~/server/utils/cv')
    expect(await buildSnapshot()).toEqual({
      version: 2, about: { text_ru: '', text_en: '' }, experience: [], education: [], skills: [],
    })
  })

  test('сохраняет порядок записей и вложенных списков без внутренних полей БД', async () => {
    const { buildSnapshot } = await import('~~/server/utils/cv')
    const job = experience({ bullets: [{ text_ru: 'Второе', text_en: '' }, { text_ru: 'Первое', text_en: 'First' }] })
    const school = education()
    const group = skills({ items: ['Rust', 'TypeScript', 'Rust'] })
    dbState.experience = [{ ...job, id: 7, order: 5, bullets: job.bullets.map((bullet, order) => ({ ...bullet, id: order, order })) }]
    dbState.education = [{ ...school, id: 8, order: 2 }]
    dbState.skills = [{ ...group, id: 9, order: 4, skills: group.items.map((name, order) => ({ id: order, name, order })) }]
    expect(await buildSnapshot()).toEqual({
      version: 2, about: { text_ru: '', text_en: '' }, experience: [job], education: [school], skills: [group],
    })
    expect(writes()).toEqual([])
  })
})

describe('Границы разбора резюме', () => {
  test('игнорирует неверный тип секции и не переносит версию из файла', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(parseSnapshot({ version: 99, about: null, experience: {}, education: 'text', skills: 42 })).toEqual({})
    expect(parseSnapshot([])).toEqual({})
    expect(parseSnapshot({ about: [] })).toEqual({ about: { text_ru: '', text_en: '' } })
  })

  test('очищает образование, проверяя формат даты, но не её календарную корректность', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(parseSnapshot({ education: [
      { institution: ' ', date_from: '2020-01-01' },
      { institution: 'University', date_from: '2020-1-01' },
      { institution: ' University ', specialization_ru: 42, specialization_en: ' SE ', date_from: ' 2020-99-99 ', date_to: 'bad' },
    ] }).education).toEqual([{
      institution: 'University', specialization_ru: '', specialization_en: 'SE', date_from: '2020-99-99', date_to: null,
    }])
  })

  test('сохраняет перевод достижения, порядок и повторяющиеся навыки', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const raw = {
      experience: [{ company_ru: ' ', company: ' Legacy ', date_from: '2020-01-01', bullets: [
        { text_ru: 42, text_en: ' English only ' }, 42, ' Второе ', { text_ru: '', text_en: '' },
      ] }],
      skills: [{ slug: ' lang ', items: [' Rust ', 'Rust', '', false, ' TypeScript '] }],
    }
    const before = structuredClone(raw)
    const result = parseSnapshot(raw)
    expect(result.experience?.[0]).toMatchObject({ company_ru: 'Legacy', bullets: [
      { text_ru: '', text_en: 'English only' }, { text_ru: 'Второе', text_en: '' },
    ] })
    expect(result.skills?.[0]?.items).toEqual(['Rust', 'Rust', 'TypeScript'])
    expect(raw).toEqual(before)
  })

  test.each(['experience', 'education', 'skills'])('сохраняет ошибку для null внутри секции %s', async (section) => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(() => parseSnapshot({ [section]: [null] })).toThrow(TypeError)
  })

  test('сохраняет ошибку для null внутри достижений', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(() => parseSnapshot({ experience: [{ ...experience(), bullets: [null] }] })).toThrow(TypeError)
  })
})

describe('Порядок и сопоставление изменений резюме', () => {
  test('сохраняет порядок секций, полей, добавлений и удалений', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.about = { id: 1, text_ru: '', text_en: '' }
    dbState.experience = [{ ...experience(), id: 7, order: 0 }, { ...experience({ company_ru: 'Удалить' }), id: 8, order: 1 }]
    dbState.education = [{ ...education(), id: 9, order: 0 }]
    dbState.skills = [{ id: 10, slug: 'lang', name_ru: 'Languages', name_en: '', skills: [], order: 0 }]
    const out = await diffSnapshot({
      about: { text_ru: 'Обо мне', text_en: 'About' },
      experience: [experience({ company_ru: ' ACME ', company_en: 'Acme EN', position_ru: 'Senior', position_en: 'Senior EN', date_to: '2025-01-01', bullets: [{ text_ru: 'Новое', text_en: '' }] }), experience({ company_ru: 'Новая' })],
      education: [education({ institution: ' UNIVERSITY ', specialization_ru: 'Новое', specialization_en: 'New', date_to: '2024-01-01' })],
      skills: [skills({ name_ru: 'Навыки', name_en: 'Skills', items: ['Rust'] })],
    })
    expect(out.map((bound) => bound.change.id)).toEqual([
      'about:text_ru', 'about:text_en', 'experience:7:company_ru', 'experience:7:company_en',
      'experience:7:position_ru', 'experience:7:position_en', 'experience:7:date_to', 'experience:7:bullets',
      'experience:add:1', 'experience:remove:8', 'education:9:institution', 'education:9:specialization_ru',
      'education:9:specialization_en', 'education:9:date_to', 'skills:10:name_ru', 'skills:10:name_en', 'skills:10:items',
    ])
    expect(writes()).toEqual([])
  })

  test('выбирает последнюю запись БД с одинаковым ключом и не объединяет повторы импорта', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.experience = [
      { ...experience(), id: 7, order: 0 }, { ...experience(), id: 8, order: 1 },
    ]
    const out = await diffSnapshot({ experience: [experience({ position_ru: 'One' }), experience({ position_ru: 'Two' })] })
    expect(out.map((bound) => [bound.change.id, bound.change.after])).toEqual([
      ['experience:8:position_ru', 'One'], ['experience:8:position_ru', 'Two'],
    ])
  })

  test('не предлагает менять slug только из-за регистра и пробелов', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.skills = [{ id: 3, order: 0, slug: 'lang', name_ru: 'Languages', name_en: '', skills: [{ name: 'Rust' }] }]
    expect(await diffSnapshot({ skills: [skills({ slug: ' LANG ', items: ['Rust'] })] })).toEqual([])
  })

  test('считает отсутствие и null даты окончания одинаковыми', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.experience = [{ ...experience(), date_to: undefined, id: 7, order: 0 }]
    dbState.education = [{ ...education(), date_to: undefined, id: 8, order: 0 }]
    expect(await diffSnapshot({ experience: [experience()], education: [education()] })).toEqual([])
  })

  test('привязывает составной список и новую запись к исходным данным', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.skills = [{ id: 3, order: 0, slug: 'lang', name_ru: '', name_en: 'English', skills: [{ name: 'Rust' }] }]
    const group = skills({ name_ru: '', name_en: 'English', items: ['Rust', 'Rust'] })
    const job = experience({ company_ru: 'New', position_ru: '', position_en: 'Engineer' })
    const out = await diffSnapshot({ experience: [job], skills: [group] })
    expect(out[0]).toMatchObject({ targetId: undefined, record: job, change: { id: 'experience:add:0', label: 'New — Engineer', editable: false } })
    expect(out[0]?.record).toBe(job)
    expect(out[1]).toMatchObject({ targetId: 3, record: group.items, change: { label: 'Skills — English', before: ['Rust'], after: ['Rust', 'Rust'], editable: false } })
    expect(out[1]?.record).toBe(group.items)
  })

  test('удаляет образование и навыки с прежними подписями и значениями', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    dbState.education = [{ ...education({ specialization_ru: '', specialization_en: 'English' }), id: 9, order: 0 }]
    dbState.skills = [{ id: 10, order: 0, slug: 'lang', name_ru: '', name_en: 'English', skills: [{ name: 'Rust' }] }]
    const out = await diffSnapshot({ education: [], skills: [] })
    expect(out).toEqual([
      { targetId: 9, record: undefined, change: { id: 'education:remove:9', section: 'education', kind: 'remove', label: 'University — ', before: '', after: null, editable: false } },
      { targetId: 10, record: undefined, change: { id: 'skills:remove:10', section: 'skills', kind: 'remove', label: 'Skills — lang', before: ['Rust'], after: null, editable: false } },
    ])
  })
})

describe('Применение выбранных изменений резюме', () => {
  test('ничего не записывает при пустом списке изменений', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([])
    expect(writes()).toEqual([])
  })

  test('добавляет записи после максимального порядка отдельно для каждой секции', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    dbState.experience = [{ ...experience(), id: 7, order: 9 }, { ...experience(), id: 8, order: 2 }]
    dbState.education = [{ ...education(), id: 9, order: -3 }]
    dbState.skills = [{ id: 10, order: 4, slug: 'old', name_ru: '', name_en: '', skills: [] }]
    const selected = [
      selectedChange({ section: 'experience', kind: 'add' }, { record: experience() }),
      selectedChange({ section: 'education', kind: 'add' }, { record: education() }),
      selectedChange({ section: 'skills', kind: 'add' }, { record: skills() }),
      selectedChange({ section: 'experience', kind: 'remove' }, { targetId: 7 }),
      selectedChange({ section: 'experience', kind: 'add' }, { record: experience() }),
    ]
    const before = structuredClone(selected)
    await applyChanges(selected)
    expect(stepArg(sqlState.calls, 'insert:experience', 'values', 0)).toEqual({ ...experienceSnapshotValues(), order: 10 })
    expect(stepArg(sqlState.calls, 'insert:experience', 'values', 1)).toEqual({ ...experienceSnapshotValues(), order: 11 })
    expect(stepArg(sqlState.calls, 'insert:education', 'values')).toEqual({ ...education(), order: 0 })
    expect(stepArg(sqlState.calls, 'insert:skill_group', 'values')).toEqual({ slug: 'lang', name_ru: 'Languages', name_en: '', order: 5 })
    expect(writes()).toEqual(['insert:experience', 'insert:education', 'insert:skill_group', 'delete:experience', 'insert:experience'])
    expect(selected).toEqual(before)
  })

  test('создаёт достижения и навыки после родителя в исходном порядке', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([
      selectedChange({ section: 'experience', kind: 'add' }, { record: experience({ bullets: [{ text_ru: 'Первое', text_en: 'First' }, { text_ru: 'Второе', text_en: '' }] }) }),
      selectedChange({ section: 'skills', kind: 'add' }, { record: skills({ items: ['Rust', 'Rust'] }) }),
    ])
    expect(writes()).toEqual(['insert:experience', 'insert:experience_bullet', 'insert:skill_group', 'insert:skill'])
    expect(stepArg(sqlState.calls, 'insert:experience_bullet', 'values')).toEqual([
      { experience_id: 11, text_ru: 'Первое', text_en: 'First', order: 0 },
      { experience_id: 11, text_ru: 'Второе', text_en: '', order: 1 },
    ])
    expect(stepArg(sqlState.calls, 'insert:skill', 'values')).toEqual([
      { group_id: 21, name: 'Rust', order: 0 }, { group_id: 21, name: 'Rust', order: 1 },
    ])
    expect(sqlState.calls[0]?.steps.map((step) => step.m)).toEqual(['insert', 'values', 'returning'])
    expect(sqlState.calls[2]?.steps.map((step) => step.m)).toEqual(['insert', 'values', 'returning'])
  })

  test('не создаёт дочерние записи без возвращённого родителя, но расходует порядок', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    plan(sqlState)
    await applyChanges([
      selectedChange({ section: 'experience', kind: 'add' }, { record: experience({ bullets: [{ text_ru: 'One', text_en: '' }] }) }),
      selectedChange({ section: 'skills', kind: 'add' }, { record: skills({ items: ['Rust'] }) }),
      selectedChange({ section: 'experience', kind: 'add' }, { record: experience() }),
    ])
    expect(writes()).toEqual(['insert:experience', 'insert:skill_group', 'insert:experience'])
    expect(stepArg(sqlState.calls, 'insert:experience', 'values', 1)).toMatchObject({ order: 1 })
  })

  test('заменяет списки через удаление и вставку с порядком от нуля', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([
      selectedChange({ section: 'experience', kind: 'update', field: 'bullets', after: ['Не использовать'] }, { targetId: 7, record: [{ text_ru: 'Новое', text_en: 'New' }] }),
      selectedChange({ section: 'skills', kind: 'update', field: 'items', after: ['Не использовать'] }, { targetId: 3, record: ['Docker'] }),
    ])
    expect(writes()).toEqual(['delete:experience_bullet', 'insert:experience_bullet', 'delete:skill', 'insert:skill'])
    expect(stepArg(sqlState.calls, 'insert:experience_bullet', 'values')).toEqual([{ experience_id: 7, text_ru: 'Новое', text_en: 'New', order: 0 }])
    expect(stepArg(sqlState.calls, 'insert:skill', 'values')).toEqual([{ group_id: 3, name: 'Docker', order: 0 }])
  })

  test('очищает пустые списки без пустых SQL-вставок', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([
      selectedChange({ section: 'experience', kind: 'update', field: 'bullets' }, { targetId: 7, record: [] }),
      selectedChange({ section: 'skills', kind: 'update', field: 'items' }, { targetId: 3, record: [] }),
    ])
    expect(writes()).toEqual(['delete:experience_bullet', 'delete:skill'])
  })

  test('обновляет скалярные поля без приведения типов, кроме текста обо мне', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([
      selectedChange({ section: 'about', kind: 'update', field: 'text_ru', after: 42 }),
      selectedChange({ section: 'experience', kind: 'update', field: 'date_to', after: null }, { targetId: 7 }),
      selectedChange({ section: 'education', kind: 'update', field: 'specialization_ru', after: 'Новое' }, { targetId: 8 }),
      selectedChange({ section: 'skills', kind: 'update', field: 'name_en', after: 'New' }, { targetId: 3 }),
    ])
    expect(writes()).toEqual(['update:about_me', 'update:experience', 'update:education', 'update:skill_group'])
    expect(stepArg(sqlState.calls, 'update:about_me', 'set')).toEqual({ text_ru: '42', updated_at: expect.any(String) })
    expect(stepArg(sqlState.calls, 'update:experience', 'set')).toEqual({ date_to: null })
    expect(stepArg(sqlState.calls, 'update:education', 'set')).toEqual({ specialization_ru: 'Новое' })
    expect(stepArg(sqlState.calls, 'update:skill_group', 'set')).toEqual({ name_en: 'New' })
    const { eq } = await import('drizzle-orm')
    const schema = await import('~~/server/db/schema')
    expect(stepArg(sqlState.calls, 'update:about_me', 'where')).toEqual(eq(schema.aboutMe.id, 1))
    expect(stepArg(sqlState.calls, 'update:experience', 'where')).toEqual(eq(schema.experience.id, 7))
    expect(stepArg(sqlState.calls, 'update:education', 'where')).toEqual(eq(schema.education.id, 8))
    expect(stepArg(sqlState.calls, 'update:skill_group', 'where')).toEqual(eq(schema.skillGroup.id, 3))
  })

  test('сохраняет явный нулевой ID текста и удаляет только выбранные записи', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    await applyChanges([
      selectedChange({ section: 'about', kind: 'update', field: 'text_en', after: null }, { targetId: 0 }),
      selectedChange({ section: 'education', kind: 'remove' }, { targetId: 8 }),
      selectedChange({ section: 'skills', kind: 'remove' }, { targetId: 3 }),
    ])
    const { eq } = await import('drizzle-orm')
    const schema = await import('~~/server/db/schema')
    expect(stepArg(sqlState.calls, 'update:about_me', 'where')).toEqual(eq(schema.aboutMe.id, 0))
    expect(stepArg(sqlState.calls, 'update:about_me', 'set')).toMatchObject({ text_en: 'null' })
    expect(stepArg(sqlState.calls, 'delete:education', 'where')).toEqual(eq(schema.education.id, 8))
    expect(stepArg(sqlState.calls, 'delete:skill_group', 'where')).toEqual(eq(schema.skillGroup.id, 3))
    expect(writes()).toEqual(['update:about_me', 'delete:education', 'delete:skill_group'])
  })

  test('останавливает последовательное применение после ошибки SQL', async () => {
    const { applyChanges } = await import('~~/server/utils/cv')
    sqlFailure.operation = 'insert'
    await expect(applyChanges([
      selectedChange({ section: 'about', kind: 'update', field: 'text_ru', after: 'Сохранить' }),
      selectedChange({ section: 'education', kind: 'add' }, { record: education() }),
      selectedChange({ section: 'about', kind: 'update', field: 'text_en', after: 'Не применять' }),
    ])).rejects.toThrow('SQL failed')
    expect(writes()).toEqual(['update:about_me'])
    expect(stepArg(sqlState.calls, 'update:about_me', 'set')).toMatchObject({ text_ru: 'Сохранить' })
  })
})

function experienceSnapshotValues() {
  const { bullets: _bullets, ...values } = experience()
  return values
}
