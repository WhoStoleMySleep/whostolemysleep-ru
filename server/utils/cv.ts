import { eq } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

/**
 * Резюме одним файлом: снимок всех четырёх блоков в обоих языках.
 *
 * Нужен для двух вещей сразу — выгрузки («шаблон», по которому резюме
 * правится в текстовом редакторе) и загрузки обратно. Порядок записей
 * в массивах и есть порядок на странице.
 */

export const CV_VERSION = 1

export interface CvBullet { text_ru: string; text_en: string }

export interface CvExperience {
  company:     string
  position_ru: string
  position_en: string
  date_from:   string
  date_to:     string | null
  bullets:     CvBullet[]
}

export interface CvEducation {
  institution:       string
  specialization_ru: string
  specialization_en: string
  date_from:         string
  date_to:           string | null
}

export interface CvSkillGroup {
  slug:    string
  name_ru: string
  name_en: string
  items:   string[]
}

export interface CvSnapshot {
  version:    number
  about:      { text_ru: string; text_en: string }
  experience: CvExperience[]
  education:  CvEducation[]
  skills:     CvSkillGroup[]
}

/* ── Чтение из базы ── */

async function readDb() {
  const [about, experience, education, skills] = await Promise.all([
    db.query.aboutMe.findFirst(),
    db.query.experience.findMany({
      with: { bullets: { orderBy: (b, { asc }) => [asc(b.order)] } },
      orderBy: (e, { asc }) => [asc(e.order)],
    }),
    db.query.education.findMany({ orderBy: (e, { asc }) => [asc(e.order)] }),
    db.query.skillGroup.findMany({
      with: { skills: { orderBy: (s, { asc }) => [asc(s.order)] } },
      orderBy: (g, { asc }) => [asc(g.order)],
    }),
  ])

  return { about, experience, education, skills }
}

type DbState = Awaited<ReturnType<typeof readDb>>

export async function buildSnapshot(): Promise<CvSnapshot> {
  const state = await readDb()
  return {
    version: CV_VERSION,
    about: {
      text_ru: state.about?.text_ru ?? '',
      text_en: state.about?.text_en ?? '',
    },
    experience: state.experience.map((e) => ({
      company:     e.company,
      position_ru: e.position_ru,
      position_en: e.position_en,
      date_from:   e.date_from,
      date_to:     e.date_to,
      bullets:     e.bullets.map((b) => ({ text_ru: b.text_ru, text_en: b.text_en })),
    })),
    education: state.education.map((e) => ({
      institution:       e.institution,
      specialization_ru: e.specialization_ru,
      specialization_en: e.specialization_en,
      date_from:         e.date_from,
      date_to:           e.date_to,
    })),
    skills: state.skills.map((g) => ({
      slug:    g.slug,
      name_ru: g.name_ru,
      name_en: g.name_en,
      items:   g.skills.map((s) => s.name),
    })),
  }
}

/* ── Разбор загруженного файла ── */

const str  = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const date = (v: unknown) => {
  const s = str(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * Что не разобралось — отбрасывается молча: файл правят руками, и одна
 * опечатка в необязательном поле не должна отменять весь импорт.
 * Отсутствующий раздел не считается «удалить всё» — он просто не трогается.
 */
export function parseSnapshot(raw: unknown): Partial<CvSnapshot> {
  if (!raw || typeof raw !== 'object') {
    throw createError({ statusCode: 400, message: 'Expected a JSON object' })
  }
  const src = raw as Record<string, unknown>
  const out: Partial<CvSnapshot> = {}

  if (src.about && typeof src.about === 'object') {
    const a = src.about as Record<string, unknown>
    out.about = { text_ru: str(a.text_ru), text_en: str(a.text_en) }
  }

  if (Array.isArray(src.experience)) {
    out.experience = src.experience
      .map((item): CvExperience | null => {
        const e = item as Record<string, unknown>
        const company = str(e.company)
        const from    = date(e.date_from)
        if (!company || !from) return null
        return {
          company,
          position_ru: str(e.position_ru),
          position_en: str(e.position_en),
          date_from:   from,
          date_to:     date(e.date_to),
          bullets: (Array.isArray(e.bullets) ? e.bullets : [])
            .map((b) => {
              const bl = b as Record<string, unknown>
              // Строка вместо объекта — частый способ записать пункт руками.
              if (typeof b === 'string') return { text_ru: b.trim(), text_en: '' }
              return { text_ru: str(bl.text_ru), text_en: str(bl.text_en) }
            })
            .filter((b) => b.text_ru || b.text_en),
        }
      })
      .filter((e): e is CvExperience => e !== null)
  }

  if (Array.isArray(src.education)) {
    out.education = src.education
      .map((item): CvEducation | null => {
        const e = item as Record<string, unknown>
        const institution = str(e.institution)
        const from        = date(e.date_from)
        if (!institution || !from) return null
        return {
          institution,
          specialization_ru: str(e.specialization_ru),
          specialization_en: str(e.specialization_en),
          date_from:         from,
          date_to:           date(e.date_to),
        }
      })
      .filter((e): e is CvEducation => e !== null)
  }

  if (Array.isArray(src.skills)) {
    out.skills = src.skills
      .map((item): CvSkillGroup | null => {
        const g = item as Record<string, unknown>
        const slug = str(g.slug)
        if (!slug) return null
        return {
          slug,
          name_ru: str(g.name_ru),
          name_en: str(g.name_en),
          items: (Array.isArray(g.items) ? g.items : [])
            .map((s) => str(s))
            .filter(Boolean),
        }
      })
      .filter((g): g is CvSkillGroup => g !== null)
  }

  return out
}

/* ── Сравнение ── */

export type CvSection = 'about' | 'experience' | 'education' | 'skills'

export interface CvChange {
  id:      string
  section: CvSection
  kind:    'add' | 'update' | 'remove'
  /** Как запись называется в списке изменений. */
  label:   string
  field?:  string
  before:  unknown
  after:   unknown
  /** Скалярное поле можно поправить прямо в списке перед применением. */
  editable: boolean
}

/** Внутренняя привязка изменения к строке базы: наружу не отдаётся. */
interface Bound { change: CvChange; targetId?: number; record?: unknown }

const key = (...parts: string[]) => parts.map((p) => p.trim().toLowerCase()).join('|')

function sameList(a: unknown[], b: unknown[]) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export async function diffSnapshot(input: Partial<CvSnapshot>): Promise<Bound[]> {
  const state: DbState = await readDb()
  const out: Bound[] = []

  const push = (
    c: Omit<CvChange, 'editable'> & { editable?: boolean },
    targetId?: number,
    record?: unknown,
  ) => out.push({ change: { editable: false, ...c }, targetId, record })

  /* About */
  if (input.about) {
    for (const field of ['text_ru', 'text_en'] as const) {
      const before = state.about?.[field] ?? ''
      const after  = input.about[field]
      if (before === after) continue
      push({
        id: `about:${field}`, section: 'about', kind: 'update',
        label: field === 'text_ru' ? 'About — Russian' : 'About — English',
        field, before, after, editable: true,
      }, state.about?.id)
    }
  }

  /* Experience */
  if (input.experience) {
    const byKey = new Map(state.experience.map((e) => [key(e.company, e.date_from), e]))
    const seen  = new Set<string>()

    input.experience.forEach((item, index) => {
      const k = key(item.company, item.date_from)
      seen.add(k)
      const row = byKey.get(k)
      const label = `${item.company} — ${item.position_ru || item.position_en}`

      if (!row) {
        push({
          id: `experience:add:${index}`, section: 'experience', kind: 'add',
          label, before: null, after: item,
        }, undefined, item)
        return
      }

      for (const field of ['company', 'position_ru', 'position_en', 'date_from', 'date_to'] as const) {
        if ((row[field] ?? null) === (item[field] ?? null)) continue
        push({
          id: `experience:${row.id}:${field}`, section: 'experience', kind: 'update',
          label, field, before: row[field], after: item[field], editable: true,
        }, row.id)
      }

      const before = row.bullets.map((b) => ({ text_ru: b.text_ru, text_en: b.text_en }))
      if (!sameList(before, item.bullets)) {
        push({
          id: `experience:${row.id}:bullets`, section: 'experience', kind: 'update',
          label, field: 'bullets', before, after: item.bullets,
        }, row.id, item.bullets)
      }
    })

    for (const row of state.experience) {
      if (seen.has(key(row.company, row.date_from))) continue
      push({
        id: `experience:remove:${row.id}`, section: 'experience', kind: 'remove',
        label: `${row.company} — ${row.position_ru}`, before: row.position_ru, after: null,
      }, row.id)
    }
  }

  /* Education */
  if (input.education) {
    const byKey = new Map(state.education.map((e) => [key(e.institution, e.date_from), e]))
    const seen  = new Set<string>()

    input.education.forEach((item, index) => {
      const k = key(item.institution, item.date_from)
      seen.add(k)
      const row = byKey.get(k)
      const label = `${item.institution} — ${item.specialization_ru || item.specialization_en}`

      if (!row) {
        push({
          id: `education:add:${index}`, section: 'education', kind: 'add',
          label, before: null, after: item,
        }, undefined, item)
        return
      }

      for (const field of ['institution', 'specialization_ru', 'specialization_en', 'date_from', 'date_to'] as const) {
        if ((row[field] ?? null) === (item[field] ?? null)) continue
        push({
          id: `education:${row.id}:${field}`, section: 'education', kind: 'update',
          label, field, before: row[field], after: item[field], editable: true,
        }, row.id)
      }
    })

    for (const row of state.education) {
      if (seen.has(key(row.institution, row.date_from))) continue
      push({
        id: `education:remove:${row.id}`, section: 'education', kind: 'remove',
        label: `${row.institution} — ${row.specialization_ru}`, before: row.specialization_ru, after: null,
      }, row.id)
    }
  }

  /* Skills */
  if (input.skills) {
    const byKey = new Map(state.skills.map((g) => [key(g.slug), g]))
    const seen  = new Set<string>()

    input.skills.forEach((item, index) => {
      const k = key(item.slug)
      seen.add(k)
      const row = byKey.get(k)
      const label = `Skills — ${item.name_ru || item.name_en || item.slug}`

      if (!row) {
        push({
          id: `skills:add:${index}`, section: 'skills', kind: 'add',
          label, before: null, after: item,
        }, undefined, item)
        return
      }

      for (const field of ['name_ru', 'name_en'] as const) {
        if (row[field] === item[field]) continue
        push({
          id: `skills:${row.id}:${field}`, section: 'skills', kind: 'update',
          label, field, before: row[field], after: item[field], editable: true,
        }, row.id)
      }

      const before = row.skills.map((s) => s.name)
      if (!sameList(before, item.items)) {
        push({
          id: `skills:${row.id}:items`, section: 'skills', kind: 'update',
          label, field: 'items', before, after: item.items,
        }, row.id, item.items)
      }
    })

    for (const row of state.skills) {
      if (seen.has(key(row.slug))) continue
      push({
        id: `skills:remove:${row.id}`, section: 'skills', kind: 'remove',
        label: `Skills — ${row.name_ru || row.slug}`, before: row.skills.map((s) => s.name), after: null,
      }, row.id)
    }
  }

  return out
}

/* ── Применение ── */

/**
 * Применяет отобранные изменения по очереди.
 *
 * Neon ходит по HTTP, транзакций у драйвера нет — поэтому изменения
 * независимы: каждое либо прошло целиком, либо не прошло, и частично
 * применённый импорт остаётся валидным состоянием резюме.
 */
export async function applyChanges(bounds: Bound[]): Promise<void> {
  const state = await readDb()

  // Новые записи уходят в конец списка — порядок правится перетаскиванием.
  const next = {
    experience: Math.max(-1, ...state.experience.map((e) => e.order)) + 1,
    education:  Math.max(-1, ...state.education.map((e) => e.order)) + 1,
    skills:     Math.max(-1, ...state.skills.map((g) => g.order)) + 1,
  }

  for (const bound of bounds) {
    await applyOne(bound, next)
  }
}

type NextOrder = { experience: number; education: number; skills: number }

async function applyOne({ change, targetId, record }: Bound, next: NextOrder): Promise<void> {
  if (change.section === 'about') {
    await db.update(schema.aboutMe)
      .set({ [change.field as string]: String(change.after), updated_at: new Date().toISOString() })
      .where(eq(schema.aboutMe.id, targetId ?? 1))
    return
  }

  if (change.section === 'experience') {
    if (change.kind === 'add') {
      const item = record as CvExperience
      const [created] = await db.insert(schema.experience).values({
        company:     item.company,
        position_ru: item.position_ru,
        position_en: item.position_en,
        date_from:   item.date_from,
        date_to:     item.date_to,
        order:       next.experience++,
      }).returning()
      if (created && item.bullets.length) {
        await db.insert(schema.experienceBullet).values(
          item.bullets.map((b, i) => ({ experience_id: created.id, text_ru: b.text_ru, text_en: b.text_en, order: i })),
        )
      }
      return
    }

    if (change.kind === 'remove') {
      await db.delete(schema.experience).where(eq(schema.experience.id, targetId as number))
      return
    }

    if (change.field === 'bullets') {
      const bullets = record as CvBullet[]
      await db.delete(schema.experienceBullet)
        .where(eq(schema.experienceBullet.experience_id, targetId as number))
      if (bullets.length) {
        await db.insert(schema.experienceBullet).values(
          bullets.map((b, i) => ({ experience_id: targetId as number, text_ru: b.text_ru, text_en: b.text_en, order: i })),
        )
      }
      return
    }

    await db.update(schema.experience)
      .set({ [change.field as string]: change.after })
      .where(eq(schema.experience.id, targetId as number))
    return
  }

  if (change.section === 'education') {
    if (change.kind === 'add') {
      const item = record as CvEducation
      await db.insert(schema.education).values({
        institution:       item.institution,
        specialization_ru: item.specialization_ru,
        specialization_en: item.specialization_en,
        date_from:         item.date_from,
        date_to:           item.date_to,
        order:             next.education++,
      })
      return
    }

    if (change.kind === 'remove') {
      await db.delete(schema.education).where(eq(schema.education.id, targetId as number))
      return
    }

    await db.update(schema.education)
      .set({ [change.field as string]: change.after })
      .where(eq(schema.education.id, targetId as number))
    return
  }

  /* skills */
  if (change.kind === 'add') {
    const item = record as CvSkillGroup
    const [created] = await db.insert(schema.skillGroup).values({
      slug:    item.slug,
      name_ru: item.name_ru,
      name_en: item.name_en,
      order:   next.skills++,
    }).returning()
    if (created && item.items.length) {
      await db.insert(schema.skill).values(
        item.items.map((name, i) => ({ group_id: created.id, name, order: i })),
      )
    }
    return
  }

  if (change.kind === 'remove') {
    await db.delete(schema.skillGroup).where(eq(schema.skillGroup.id, targetId as number))
    return
  }

  if (change.field === 'items') {
    const items = record as string[]
    await db.delete(schema.skill).where(eq(schema.skill.group_id, targetId as number))
    if (items.length) {
      await db.insert(schema.skill).values(
        items.map((name, i) => ({ group_id: targetId as number, name, order: i })),
      )
    }
    return
  }

  await db.update(schema.skillGroup)
    .set({ [change.field as string]: change.after })
    .where(eq(schema.skillGroup.id, targetId as number))
}

export type { Bound as CvBound }
