import { eq } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

/** Версия 2 разделяет название компании на русский и английский переводы. */
export const CV_VERSION = 2

/** Достижение сохраняется на обоих языках, даже если один перевод ещё не заполнен. */
export interface CvBullet { text_ru: string; text_en: string }

/** Порядок достижений в файле определяет их порядок в резюме. */
export interface CvExperience {
  company_ru:  string
  company_en:  string
  position_ru: string
  position_en: string
  date_from:   string
  date_to:     string | null
  bullets:     CvBullet[]
}

/** Пустая дата окончания означает продолжающееся обучение. */
export interface CvEducation {
  institution:       string
  specialization_ru: string
  specialization_en: string
  date_from:         string
  date_to:           string | null
}

/** Slug связывает группу из редактируемого файла с существующей записью. */
export interface CvSkillGroup {
  slug:    string
  name_ru: string
  name_en: string
  items:   string[]
}

/** Один формат используется для экспорта и импорта; порядок массивов значим. */
export interface CvSnapshot {
  version:    number
  about:      { text_ru: string; text_en: string }
  experience: CvExperience[]
  education:  CvEducation[]
  skills:     CvSkillGroup[]
}

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

function experienceSnapshot(row: DbState['experience'][number]): CvExperience {
  return {
    company_ru: row.company_ru,
    company_en: row.company_en,
    position_ru: row.position_ru,
    position_en: row.position_en,
    date_from: row.date_from,
    date_to: row.date_to,
    bullets: row.bullets.map((bullet) => ({ text_ru: bullet.text_ru, text_en: bullet.text_en })),
  }
}

function educationSnapshot(row: DbState['education'][number]): CvEducation {
  return {
    institution: row.institution,
    specialization_ru: row.specialization_ru,
    specialization_en: row.specialization_en,
    date_from: row.date_from,
    date_to: row.date_to,
  }
}

function skillsSnapshot(row: DbState['skills'][number]): CvSkillGroup {
  return {
    slug: row.slug,
    name_ru: row.name_ru,
    name_en: row.name_en,
    items: row.skills.map((skill) => skill.name),
  }
}

/** Исключает внутренние ID и порядок БД из файла для ручного редактирования. */
export async function buildSnapshot(): Promise<CvSnapshot> {
  const state = await readDb()
  return {
    version: CV_VERSION,
    about: {
      text_ru: state.about?.text_ru ?? '',
      text_en: state.about?.text_en ?? '',
    },
    experience: state.experience.map(experienceSnapshot),
    education: state.education.map(educationSnapshot),
    skills: state.skills.map(skillsSnapshot),
  }
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const date = (value: unknown) => {
  const text = str(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function parseAbout(value: object): CvSnapshot['about'] {
  const about = value as Record<string, unknown>
  return { text_ru: str(about.text_ru), text_en: str(about.text_en) }
}

function parseBullet(value: unknown): CvBullet {
  // Строка — допустимое сокращение для достижения, написанного вручную.
  if (typeof value === 'string') return { text_ru: value.trim(), text_en: '' }
  const bullet = value as Record<string, unknown>
  return { text_ru: str(bullet.text_ru), text_en: str(bullet.text_en) }
}

function parseBullets(value: unknown): CvBullet[] {
  if (!Array.isArray(value)) return []
  return value.map(parseBullet).filter((bullet) => bullet.text_ru || bullet.text_en)
}

function parseExperience(value: unknown): CvExperience | null {
  const item = value as Record<string, unknown>
  // Экспорт до версии 2 содержит одно поле company вместо двух переводов.
  const companyRu = str(item.company_ru) || str(item.company)
  const from = date(item.date_from)
  if (!companyRu || !from) return null
  return {
    company_ru: companyRu,
    company_en: str(item.company_en),
    position_ru: str(item.position_ru),
    position_en: str(item.position_en),
    date_from: from,
    date_to: date(item.date_to),
    bullets: parseBullets(item.bullets),
  }
}

function parseEducation(value: unknown): CvEducation | null {
  const item = value as Record<string, unknown>
  const institution = str(item.institution)
  const from = date(item.date_from)
  if (!institution || !from) return null
  return {
    institution,
    specialization_ru: str(item.specialization_ru),
    specialization_en: str(item.specialization_en),
    date_from: from,
    date_to: date(item.date_to),
  }
}

function parseSkillGroup(value: unknown): CvSkillGroup | null {
  const item = value as Record<string, unknown>
  const slug = str(item.slug)
  if (!slug) return null
  return {
    slug,
    name_ru: str(item.name_ru),
    name_en: str(item.name_en),
    items: (Array.isArray(item.items) ? item.items : []).map(str).filter(Boolean),
  }
}

/**
 * Опечатки в необязательных полях не отменяют импорт. Отсутствующая секция
 * оставляет данные нетронутыми, а пустой массив предлагает удалить её записи.
 */
export function parseSnapshot(raw: unknown): Partial<CvSnapshot> {
  if (!raw || typeof raw !== 'object') {
    throw createError({ statusCode: 400, message: 'Expected a JSON object' })
  }
  const src = raw as Record<string, unknown>
  const out: Partial<CvSnapshot> = {}
  if (src.about && typeof src.about === 'object') out.about = parseAbout(src.about)
  if (Array.isArray(src.experience)) {
    out.experience = src.experience.map(parseExperience).filter((item): item is CvExperience => item !== null)
  }
  if (Array.isArray(src.education)) {
    out.education = src.education.map(parseEducation).filter((item): item is CvEducation => item !== null)
  }
  if (Array.isArray(src.skills)) {
    out.skills = src.skills.map(parseSkillGroup).filter((item): item is CvSkillGroup => item !== null)
  }
  return out
}

/** Отсутствующие секции импорта не участвуют в сравнении. */
export type CvSection = 'about' | 'experience' | 'education' | 'skills'

/** Только скалярное изменение можно исправить вручную перед применением. */
export interface CvChange {
  id: string
  section: CvSection
  kind: 'add' | 'update' | 'remove'
  label: string
  field?: string
  before: unknown
  after: unknown
  editable: boolean
}

interface Bound { change: CvChange; targetId?: number; record?: unknown }
type CollectionSection = Exclude<CvSection, 'about'>
type ChangeInput = Omit<CvChange, 'editable'> & { editable?: boolean }
interface ScalarComparison<T> { section: CollectionSection; label: string; fields: readonly (keyof T & string)[] }

const key = (...parts: string[]) => parts.map((part) => part.trim().toLowerCase()).join('|')
const experienceKey = (item: CvExperience) => key(item.company_ru, item.date_from)
const educationKey = (item: CvEducation) => key(item.institution, item.date_from)
const skillsKey = (item: Pick<CvSkillGroup, 'slug'>) => key(item.slug)

function sameList(before: unknown[], after: unknown[]) {
  return JSON.stringify(before) === JSON.stringify(after)
}

function bindChange(change: ChangeInput, targetId?: number, record?: unknown): Bound {
  return { change: { editable: false, ...change }, targetId, record }
}

function addition(section: CollectionSection, label: string, entry: { item: unknown; index: number }): Bound {
  return bindChange({
    id: `${section}:add:${entry.index}`, section, kind: 'add',
    label, before: null, after: entry.item,
  }, undefined, entry.item)
}

function removal(section: CollectionSection, label: string, row: { id: number; before: unknown }): Bound {
  return bindChange({
    id: `${section}:remove:${row.id}`, section, kind: 'remove', label, before: row.before, after: null,
  }, row.id)
}

function scalarChanges<T extends object>(
  { section, label, fields }: ScalarComparison<T>,
  row: Partial<Record<keyof T, unknown>> & { id: number },
  item: T,
): Bound[] {
  return fields.flatMap((field) => {
    const before = row[field]
    const after = item[field]
    const equal = section === 'skills' ? before === after : (before ?? null) === (after ?? null)
    if (equal) return []
    return [bindChange({
      id: `${section}:${row.id}:${field}`, section, kind: 'update',
      label, field, before, after, editable: true,
    }, row.id)]
  })
}

function listChanges(
  context: { section: CollectionSection; label: string; field: string; targetId: number },
  before: unknown[],
  after: unknown[],
): Bound[] {
  if (sameList(before, after)) return []
  const { section, label, field, targetId } = context
  return [bindChange({
    id: `${section}:${targetId}:${field}`, section, kind: 'update', label, field, before, after,
  }, targetId, after)]
}

function diffAbout(about: CvSnapshot['about'] | undefined, row: DbState['about']): Bound[] {
  if (!about) return []
  return (['text_ru', 'text_en'] as const).flatMap((field) => {
    const before = row?.[field] ?? ''
    const after = about[field]
    if (before === after) return []
    return [bindChange({
      id: `about:${field}`, section: 'about', kind: 'update',
      label: field === 'text_ru' ? 'About — Russian' : 'About — English',
      field, before, after, editable: true,
    }, row?.id)]
  })
}

function experienceLabel(item: CvExperience): string {
  return `${item.company_ru} — ${item.position_ru || item.position_en}`
}

function diffExperienceRow(item: CvExperience, row: DbState['experience'][number]): Bound[] {
  const label = experienceLabel(item)
  return [
    ...scalarChanges({
      section: 'experience', label,
      fields: ['company_ru', 'company_en', 'position_ru', 'position_en', 'date_from', 'date_to'],
    }, row, item),
    ...listChanges({ section: 'experience', label, field: 'bullets', targetId: row.id },
      row.bullets.map((bullet) => ({ text_ru: bullet.text_ru, text_en: bullet.text_en })), item.bullets),
  ]
}

function diffExperience(items: CvExperience[] | undefined, rows: DbState['experience']): Bound[] {
  if (!items) return []
  const byKey = new Map(rows.map((row) => [experienceKey(row), row]))
  const seen = new Set(items.map(experienceKey))
  const changes = items.flatMap((item, index) => {
    const row = byKey.get(experienceKey(item))
    return row ? diffExperienceRow(item, row) : [addition('experience', experienceLabel(item), { item, index })]
  })
  const removed = rows.filter((row) => !seen.has(experienceKey(row))).map((row) =>
    removal('experience', `${row.company_ru} — ${row.position_ru}`, { id: row.id, before: row.position_ru }))
  return [...changes, ...removed]
}

function educationLabel(item: CvEducation): string {
  return `${item.institution} — ${item.specialization_ru || item.specialization_en}`
}

function diffEducation(items: CvEducation[] | undefined, rows: DbState['education']): Bound[] {
  if (!items) return []
  const byKey = new Map(rows.map((row) => [educationKey(row), row]))
  const seen = new Set(items.map(educationKey))
  const changes = items.flatMap((item, index) => {
    const row = byKey.get(educationKey(item))
    const label = educationLabel(item)
    return row ? scalarChanges({
      section: 'education', label,
      fields: ['institution', 'specialization_ru', 'specialization_en', 'date_from', 'date_to'],
    }, row, item) : [addition('education', label, { item, index })]
  })
  const removed = rows.filter((row) => !seen.has(educationKey(row))).map((row) =>
    removal('education', `${row.institution} — ${row.specialization_ru}`, { id: row.id, before: row.specialization_ru }))
  return [...changes, ...removed]
}

function skillsLabel(item: CvSkillGroup): string {
  return `Skills — ${item.name_ru || item.name_en || item.slug}`
}

function diffSkillsRow(item: CvSkillGroup, row: DbState['skills'][number]): Bound[] {
  const label = skillsLabel(item)
  return [
    ...scalarChanges({ section: 'skills', label, fields: ['name_ru', 'name_en'] }, row, item),
    ...listChanges({ section: 'skills', label, field: 'items', targetId: row.id },
      row.skills.map((skill) => skill.name), item.items),
  ]
}

function diffSkills(items: CvSkillGroup[] | undefined, rows: DbState['skills']): Bound[] {
  if (!items) return []
  const byKey = new Map(rows.map((row) => [skillsKey(row), row]))
  const seen = new Set(items.map(skillsKey))
  const changes = items.flatMap((item, index) => {
    const row = byKey.get(skillsKey(item))
    return row ? diffSkillsRow(item, row) : [addition('skills', skillsLabel(item), { item, index })]
  })
  const removed = rows.filter((row) => !seen.has(skillsKey(row))).map((row) =>
    removal('skills', `Skills — ${row.name_ru || row.slug}`, { id: row.id, before: row.skills.map((skill) => skill.name) }))
  return [...changes, ...removed]
}

/** Сравнение ничего не записывает: администратор сначала выбирает изменения. */
export async function diffSnapshot(input: Partial<CvSnapshot>): Promise<Bound[]> {
  const state = await readDb()
  return [
    ...diffAbout(input.about, state.about),
    ...diffExperience(input.experience, state.experience),
    ...diffEducation(input.education, state.education),
    ...diffSkills(input.skills, state.skills),
  ]
}

function nextOrders(state: DbState) {
  // Новые записи добавляются в конец; ручной порядок меняется отдельно перетаскиванием.
  return {
    experience: Math.max(-1, ...state.experience.map((row) => row.order)) + 1,
    education: Math.max(-1, ...state.education.map((row) => row.order)) + 1,
    skills: Math.max(-1, ...state.skills.map((row) => row.order)) + 1,
  }
}

/**
 * Применяет изменения последовательно: HTTP-драйвер Neon не поддерживает транзакции,
 * поэтому при ошибке уже выполненные запросы остаются применёнными.
 */
export async function applyChanges(bounds: Bound[]): Promise<void> {
  const next = nextOrders(await readDb())
  for (const bound of bounds) {
    const { section, kind } = bound.change
    const order = section === 'about' ? undefined : next[section]
    await applyOne(bound, order)
    if (section !== 'about' && kind === 'add') next[section]++
  }
}

async function applyAbout({ change, targetId }: Bound): Promise<void> {
  await db.update(schema.aboutMe)
    .set({ [change.field as string]: String(change.after), updated_at: new Date().toISOString() })
    .where(eq(schema.aboutMe.id, targetId ?? 1))
}

async function insertExperienceBullets(targetId: number, bullets: CvBullet[]): Promise<void> {
  if (!bullets.length) return
  await db.insert(schema.experienceBullet).values(
    bullets.map((bullet, order) => ({ experience_id: targetId, text_ru: bullet.text_ru, text_en: bullet.text_en, order })),
  )
}

async function createExperience(item: CvExperience, order: number): Promise<void> {
  const [created] = await db.insert(schema.experience).values({
    company_ru: item.company_ru,
    company_en: item.company_en,
    position_ru: item.position_ru,
    position_en: item.position_en,
    date_from: item.date_from,
    date_to: item.date_to,
    order,
  }).returning()
  if (created) await insertExperienceBullets(created.id, item.bullets)
}

async function replaceExperienceBullets(targetId: number, bullets: CvBullet[]): Promise<void> {
  await db.delete(schema.experienceBullet).where(eq(schema.experienceBullet.experience_id, targetId))
  await insertExperienceBullets(targetId, bullets)
}

async function applyExperience({ change, targetId, record }: Bound, order: number): Promise<void> {
  if (change.kind === 'add') return createExperience(record as CvExperience, order)
  if (change.kind === 'remove') {
    await db.delete(schema.experience).where(eq(schema.experience.id, targetId as number))
    return
  }
  if (change.field === 'bullets') return replaceExperienceBullets(targetId as number, record as CvBullet[])
  await db.update(schema.experience)
    .set({ [change.field as string]: change.after })
    .where(eq(schema.experience.id, targetId as number))
}

async function createEducation(item: CvEducation, order: number): Promise<void> {
  await db.insert(schema.education).values({
    institution: item.institution,
    specialization_ru: item.specialization_ru,
    specialization_en: item.specialization_en,
    date_from: item.date_from,
    date_to: item.date_to,
    order,
  })
}

async function applyEducation({ change, targetId, record }: Bound, order: number): Promise<void> {
  if (change.kind === 'add') return createEducation(record as CvEducation, order)
  if (change.kind === 'remove') {
    await db.delete(schema.education).where(eq(schema.education.id, targetId as number))
    return
  }
  await db.update(schema.education)
    .set({ [change.field as string]: change.after })
    .where(eq(schema.education.id, targetId as number))
}

async function insertSkills(targetId: number, items: string[]): Promise<void> {
  if (!items.length) return
  await db.insert(schema.skill).values(items.map((name, order) => ({ group_id: targetId, name, order })))
}

async function createSkills(item: CvSkillGroup, order: number): Promise<void> {
  const [created] = await db.insert(schema.skillGroup).values({
    slug: item.slug,
    name_ru: item.name_ru,
    name_en: item.name_en,
    order,
  }).returning()
  if (created) await insertSkills(created.id, item.items)
}

async function replaceSkills(targetId: number, items: string[]): Promise<void> {
  await db.delete(schema.skill).where(eq(schema.skill.group_id, targetId))
  await insertSkills(targetId, items)
}

async function applySkills({ change, targetId, record }: Bound, order: number): Promise<void> {
  if (change.kind === 'add') return createSkills(record as CvSkillGroup, order)
  if (change.kind === 'remove') {
    await db.delete(schema.skillGroup).where(eq(schema.skillGroup.id, targetId as number))
    return
  }
  if (change.field === 'items') return replaceSkills(targetId as number, record as string[])
  await db.update(schema.skillGroup)
    .set({ [change.field as string]: change.after })
    .where(eq(schema.skillGroup.id, targetId as number))
}

async function applyOne(bound: Bound, order?: number): Promise<void> {
  if (bound.change.section === 'about') return applyAbout(bound)
  if (bound.change.section === 'experience') return applyExperience(bound, order as number)
  if (bound.change.section === 'education') return applyEducation(bound, order as number)
  return applySkills(bound, order as number)
}

/** Связь с ID и составными данными доступна только серверному применению изменений. */
export type { Bound as CvBound }
