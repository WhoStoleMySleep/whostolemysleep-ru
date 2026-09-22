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

/** Заменяет серверные автоимпорты Nitro, которых нет в тестовой среде. */
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
  aboutMe:    [{ id: 1, text_ru: 'старое', text_en: '' }],
  experience: [{
    id: 10, company: 'Acme', position_ru: 'Разработчик', position_en: '',
    date_from: '2020-01-01', date_to: null, order: 0,
    bullets: [{ id: 100, text_ru: 'делал', text_en: '', order: 0 }],
  }],
  education:  [] as unknown[],
  skillGroup: [{ id: 20, slug: 'lang', name_ru: 'Языки', name_en: '', order: 0, skills: [{ id: 200, name: 'TypeScript', order: 0 }] }],
}

/** Отредактированный файл: правка текста, повышение должности, новый вуз, новый навык. */
const uploaded = {
  version: 1,
  about: { text_ru: 'новое', text_en: '' },
  experience: [{
    company: 'Acme', position_ru: 'Старший разработчик', position_en: '',
    date_from: '2020-01-01', date_to: null,
    bullets: [{ text_ru: 'делал', text_en: '' }],
  }],
  education: [{ institution: 'ВУЗ', specialization_ru: 'ПО', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30' }],
  skills: [{ slug: 'lang', name_ru: 'Языки', name_en: '', items: ['TypeScript', 'Rust'] }],
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

describe('импорт резюме: выгрузка → разница → применение', () => {
  test('выгруженный файл, загруженный обратно, не даёт изменений', async () => {
    const snapshot = await exportCv()
    expect(snapshot.version).toBe(1)

    const { changes } = await diff(snapshot)
    expect(changes).toEqual([])
  })

  test('разница показывает все правки и ничего не пишет', async () => {
    const { changes } = await diff(uploaded)

    expect(changes.map((c) => c.id)).toEqual([
      'about:text_ru',
      'experience:10:position_ru',
      'education:add:0',
      'skills:20:items',
    ])
    expect(changes.find((c) => c.id === 'about:text_ru')).toMatchObject({ before: 'старое', after: 'новое', editable: true })
    expect(state.calls.every((c) => c.op === 'select')).toBe(true)
  })

  test('применяется только подтверждённое', async () => {
    const out = await apply({ snapshot: uploaded, accept: ['about:text_ru'] })

    expect(out).toEqual({ applied: 1, skipped: 0 })
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:about_me', 'set')?.text_ru).toBe('новое')
    expect(keys()).not.toContain('insert:education')
    expect(keys()).not.toContain('update:experience')
  })

  test('подтверждённое добавление уходит в конец списка', async () => {
    await apply({ snapshot: uploaded, accept: ['education:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:education', 'values')).toMatchObject({
      institution: 'ВУЗ',
      date_to:     '2019-06-30',
      order:       0,
    })
  })

  test('список навыков переписывается целиком', async () => {
    await apply({ snapshot: uploaded, accept: ['skills:20:items'] })

    expect(keys().indexOf('delete:skill')).toBeLessThan(keys().indexOf('insert:skill'))
    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([
      { group_id: 20, name: 'TypeScript', order: 0 },
      { group_id: 20, name: 'Rust', order: 1 },
    ])
  })

  test('правка значения прямо в списке уходит вместо значения из файла', async () => {
    await apply({ snapshot: uploaded, accept: ['about:text_ru'], overrides: { 'about:text_ru': 'поправленное руками' } })

    expect(stepArg<Record<string, unknown>>(state.calls, 'update:about_me', 'set')?.text_ru).toBe('поправленное руками')
  })

  test('правка списка через overrides игнорируется — там править нечего', async () => {
    await apply({ snapshot: uploaded, accept: ['skills:20:items'], overrides: { 'skills:20:items': 'ерунда' } })

    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([
      { group_id: 20, name: 'TypeScript', order: 0 },
      { group_id: 20, name: 'Rust', order: 1 },
    ])
  })

  test('неизвестный id считается отброшенным, а не применяется наугад', async () => {
    const out = await apply({ snapshot: uploaded, accept: ['about:text_ru', 'experience:999:company'] })

    expect(out).toEqual({ applied: 1, skipped: 1 })
  })

  test('без подтверждений не пишется ничего', async () => {
    const out = await apply({ snapshot: uploaded, accept: [] })

    expect(out).toEqual({ applied: 0 })
    expect(state.calls).toHaveLength(0)
  })

  test('применение ставит страницы резюме в очередь сброса кеша', async () => {
    await apply({ snapshot: uploaded, accept: ['about:text_ru'] })

    expect(stepArg(state.calls, 'insert:pending_revalidation', 'values')).toEqual([
      { path: '/' }, { path: '/resume' }, { path: '/cv' },
    ])
  })

  test('раздела нет в файле — записи раздела не удаляются', async () => {
    const { changes } = await diff({ about: { text_ru: 'новое', text_en: '' } })

    expect(changes.map((c) => c.id)).toEqual(['about:text_ru'])
  })

  test('файл, который не разобрать, — 400 ещё до чтения базы', async () => {
    await expect(diff('это не снимок')).rejects.toThrow(/JSON object/)
  })
})

describe('импорт резюме: добавления и удаления', () => {
  test('запись, которой нет в файле, предлагается удалить', async () => {
    const { changes } = await diff({ experience: [], education: [], skills: [] })

    expect(changes.map((c) => c.id)).toEqual(['experience:remove:10', 'skills:remove:20'])

    await apply({ snapshot: { experience: [], skills: [] }, accept: ['experience:remove:10', 'skills:remove:20'] })
    expect(keys()).toContain('delete:experience')
    expect(keys()).toContain('delete:skill_group')
  })

  test('новое место работы заводится вместе с пунктами и уходит в конец списка', async () => {
    const snapshot = {
      experience: [{
        company: 'Newco', position_ru: 'Инженер', position_en: '',
        date_from: '2024-01-01', date_to: null,
        bullets: [{ text_ru: 'первое', text_en: '' }, { text_ru: 'второе', text_en: '' }],
      }],
    }

    await apply({ snapshot, accept: ['experience:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:experience', 'values')).toMatchObject({ company: 'Newco', order: 1 })
    expect(stepArg(state.calls, 'insert:experience_bullet', 'values')).toEqual([
      { experience_id: 11, text_ru: 'первое', text_en: '', order: 0 },
      { experience_id: 11, text_ru: 'второе', text_en: '', order: 1 },
    ])
  })

  test('новая группа навыков заводится со своими навыками', async () => {
    const snapshot = { skills: [{ slug: 'tools', name_ru: 'Инструменты', name_en: '', items: ['Docker'] }] }

    await apply({ snapshot, accept: ['skills:add:0'] })

    expect(stepArg<Record<string, unknown>>(state.calls, 'insert:skill_group', 'values')).toMatchObject({ slug: 'tools', order: 1 })
    expect(stepArg(state.calls, 'insert:skill', 'values')).toEqual([{ group_id: 21, name: 'Docker', order: 0 }])
  })

  test('правка поля образования уходит одним обновлением', async () => {
    plan(state, {}, {
      ...current,
      education: [{ id: 30, institution: 'ВУЗ', specialization_ru: 'ПО', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30', order: 0 }],
    })

    const snapshot = { education: [{ institution: 'ВУЗ', specialization_ru: 'Программная инженерия', specialization_en: '', date_from: '2015-09-01', date_to: '2019-06-30' }] }
    const { changes } = await diff(snapshot)
    expect(changes.map((c) => c.id)).toEqual(['education:30:specialization_ru'])

    await apply({ snapshot, accept: ['education:30:specialization_ru'] })
    expect(stepArg<Record<string, unknown>>(state.calls, 'update:education', 'set')?.specialization_ru).toBe('Программная инженерия')
  })
})
