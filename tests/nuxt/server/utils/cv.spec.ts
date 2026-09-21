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
  test('разбирает полный файл', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      about: { text_ru: ' про меня ', text_en: 'about' },
      experience: [{
        company: 'Acme', position_ru: 'Разработчик', position_en: 'Developer',
        date_from: '2020-01-01', date_to: null,
        bullets: [{ text_ru: 'делал', text_en: 'did' }],
      }],
      education: [{ institution: 'ВУЗ', specialization_ru: 'ПО', specialization_en: 'SE', date_from: '2015-09-01', date_to: '2019-06-30' }],
      skills: [{ slug: 'lang', name_ru: 'Языки', name_en: 'Languages', items: ['TypeScript', 'Rust'] }],
    })

    expect(out.about).toEqual({ text_ru: 'про меня', text_en: 'about' })
    expect(out.experience).toHaveLength(1)
    expect(out.education?.[0]?.date_to).toBe('2019-06-30')
    expect(out.skills?.[0]?.items).toEqual(['TypeScript', 'Rust'])
  })

  test('не-объект — ошибка: разбирать нечего', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(() => parseSnapshot(null)).toThrow()
    expect(() => parseSnapshot('текст')).toThrow()
    expect(() => parseSnapshot(42)).toThrow()
  })

  test('отсутствующий раздел не попадает в результат — это «не трогать», а не «удалить всё»', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ about: { text_ru: 'a', text_en: 'b' } })
    expect(out).not.toHaveProperty('experience')
    expect(out).not.toHaveProperty('skills')
  })

  test('пустой раздел остаётся пустым массивом — это уже «удалить всё»', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    expect(parseSnapshot({ experience: [] }).experience).toEqual([])
  })

  test('запись без компании или с кривой датой отбрасывается, остальные проходят', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [
        { company: '', date_from: '2020-01-01' },
        { company: 'Acme', date_from: '01.01.2020' },
        { company: 'Beta', date_from: '2021-03-01' },
      ],
    })
    expect(out.experience).toHaveLength(1)
    expect(out.experience?.[0]?.company).toBe('Beta')
  })

  test('незаполненная дата окончания — это «по настоящее время», а не ошибка', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ experience: [{ company: 'Acme', date_from: '2020-01-01', date_to: 'сейчас' }] })
    expect(out.experience?.[0]?.date_to).toBeNull()
  })

  test('пункт строкой вместо объекта — частый способ записать руками', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [{ company: 'Acme', date_from: '2020-01-01', bullets: [' поднял сервис '] }],
    })
    expect(out.experience?.[0]?.bullets).toEqual([{ text_ru: 'поднял сервис', text_en: '' }])
  })

  test('пустые пункты выбрасываются, а bullets не массивом — просто пустой список', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({
      experience: [
        { company: 'Acme', date_from: '2020-01-01', bullets: ['', { text_ru: '', text_en: '' }, 'ok'] },
        { company: 'Beta', date_from: '2020-01-01', bullets: 'строкой' },
      ],
    })
    expect(out.experience?.[0]?.bullets).toHaveLength(1)
    expect(out.experience?.[1]?.bullets).toEqual([])
  })

  test('группа навыков без slug отбрасывается — привязываться не к чему', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ skills: [{ name_ru: 'Языки', items: ['Rust'] }] })
    expect(out.skills).toEqual([])
  })

  test('нестроковые навыки внутри группы отсеиваются', async () => {
    const { parseSnapshot } = await import('~~/server/utils/cv')
    const out = parseSnapshot({ skills: [{ slug: 'lang', items: ['Rust', 42, null, '  '] }] })
    expect(out.skills?.[0]?.items).toEqual(['Rust'])
  })
})

describe('diffSnapshot', () => {
  test('пустой ввод не даёт изменений', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    expect(await diffSnapshot({})).toEqual([])
  })

  test('совпадающий текст about изменением не считается', async () => {
    dbState.about = { id: 1, text_ru: 'про меня', text_en: 'about' }
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ about: { text_ru: 'про меня', text_en: 'about' } })
    expect(out).toEqual([])
  })

  test('правка about видна по полям и помечена editable', async () => {
    dbState.about = { id: 1, text_ru: 'старое', text_en: 'old' }
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ about: { text_ru: 'новое', text_en: 'old' } })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'about', kind: 'update', field: 'text_ru', before: 'старое', after: 'новое', editable: true })
  })

  test('незнакомая работа — это add', async () => {
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{ company: 'Acme', position_ru: 'Разработчик', position_en: '', date_from: '2020-01-01', date_to: null, bullets: [] }],
    })
    expect(out.map((b) => b.change.kind)).toEqual(['add'])
  })

  test('запись узнаётся по компании и дате начала, регистр и пробелы не мешают', async () => {
    dbState.experience = [{
      id: 7, order: 0, company: 'Acme', position_ru: 'Разработчик', position_en: '',
      date_from: '2020-01-01', date_to: null, bullets: [],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{ company: ' ACME ', position_ru: 'Разработчик', position_en: '', date_from: '2020-01-01', date_to: null, bullets: [] }],
    })

    expect(out.map((b) => b.change.kind)).toEqual(['update'])
    expect(out[0]?.targetId).toBe(7)
    expect(out[0]?.change.field).toBe('company')
  })

  test('исчезнувшая из файла работа — это remove', async () => {
    dbState.experience = [{
      id: 7, order: 0, company: 'Acme', position_ru: 'Разработчик', position_en: '',
      date_from: '2020-01-01', date_to: null, bullets: [],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({ experience: [] })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'experience', kind: 'remove' })
    expect(out[0]?.targetId).toBe(7)
  })

  test('пункты сравниваются списком целиком — перестановка тоже изменение', async () => {
    dbState.experience = [{
      id: 7, order: 0, company: 'Acme', position_ru: 'Р', position_en: '',
      date_from: '2020-01-01', date_to: null,
      bullets: [{ text_ru: 'один', text_en: '' }, { text_ru: 'два', text_en: '' }],
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      experience: [{
        company: 'Acme', position_ru: 'Р', position_en: '', date_from: '2020-01-01', date_to: null,
        bullets: [{ text_ru: 'два', text_en: '' }, { text_ru: 'один', text_en: '' }],
      }],
    })

    expect(out).toHaveLength(1)
    expect(out[0]?.change.field).toBe('bullets')
    expect(out[0]?.change.editable).toBe(false)
  })

  test('состав группы навыков меняется одним изменением', async () => {
    dbState.skills = [{ id: 3, order: 0, slug: 'lang', name_ru: 'Языки', name_en: 'Languages', skills: [{ name: 'Rust' }] }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    const out = await diffSnapshot({
      skills: [{ slug: 'lang', name_ru: 'Языки', name_en: 'Languages', items: ['Rust', 'TypeScript'] }],
    })

    expect(out).toHaveLength(1)
    expect(out[0]?.change).toMatchObject({ section: 'skills', field: 'items', after: ['Rust', 'TypeScript'] })
  })

  test('раздел, которого нет в файле, не порождает удалений', async () => {
    dbState.education = [{
      id: 2, order: 0, institution: 'ВУЗ', specialization_ru: 'ПО', specialization_en: '',
      date_from: '2015-09-01', date_to: null,
    }]
    const { diffSnapshot } = await import('~~/server/utils/cv')
    expect(await diffSnapshot({ about: { text_ru: '', text_en: '' } })).toHaveLength(0)
  })
})
