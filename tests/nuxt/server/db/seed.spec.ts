import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const mocks = vi.hoisted(() => ({ neon: vi.fn(), insert: vi.fn() }))
vi.mock('@neondatabase/serverless', () => ({ neon: mocks.neon }))
vi.mock('drizzle-orm/neon-http', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  const db = makeFakeDb(state) as { insert: (...args: unknown[]) => unknown }
  return { drizzle: () => ({ insert: (...args: unknown[]) => {
    mocks.insert(...args)
    return db.insert(...args)
  } }) }
})

beforeEach(() => {
  vi.resetModules()
  mocks.neon.mockReset()
  mocks.insert.mockReset()
  vi.stubEnv('POSTGRES_PRISMA_URL', 'postgres://seed.test/db')
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  plan(state, {
    'insert:tag': [[{ id: 21 }, { id: 22 }]],
    'insert:post': [[{ id: 11 }, { id: 12 }, { id: 13 }, { id: 14 }]],
    'insert:experience': [[{ id: 31 }], [{ id: 32 }]],
    'insert:skill_group': [[{ id: 41 }], [{ id: 42 }], [{ id: 43 }], [{ id: 44 }]],
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function seed() {
  await import('~~/server/db/seed')
  await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith('Done.'))
}

describe('Начальное наполнение БД', () => {
  test('выполняет те же последовательные вставки с корректными связями', async () => {
    await seed()
    expect(mocks.neon).toHaveBeenCalledExactlyOnceWith('postgres://seed.test/db')
    expect(state.calls.map(call => call.table)).toEqual([
      'about_me', 'tag', 'post', 'post_tag', 'image', 'experience', 'experience', 'experience_bullet', 'education',
      'skill_group', 'skill', 'skill_group', 'skill', 'skill_group', 'skill', 'skill_group', 'skill',
    ])
    expect(state.calls.every(call => call.op === 'insert')).toBe(true)
    expect(stepArg(state.calls, 'insert:post_tag', 'values')).toEqual([
      { post_id: 11, tag_id: 21 }, { post_id: 12, tag_id: 21 }, { post_id: 13, tag_id: 22 }, { post_id: 14, tag_id: 22 },
    ])
    expect(stepArg<{ post_id: number }[]>(state.calls, 'insert:image', 'values')?.map(image => image.post_id)).toEqual([11, 12, 13, 14])
    const bullets = stepArg<{ experience_id: number; order: number }[]>(state.calls, 'insert:experience_bullet', 'values')!
    expect(bullets.map(({ experience_id, order }) => ({ experience_id, order }))).toEqual([
      { experience_id: 31, order: 0 }, { experience_id: 31, order: 1 }, { experience_id: 31, order: 2 },
      { experience_id: 32, order: 0 }, { experience_id: 32, order: 1 }, { experience_id: 32, order: 2 }, { experience_id: 32, order: 3 },
    ])
    expect(process.exit).not.toHaveBeenCalled()
  })

  test('сохраняет преобразование исходных текстов в цитаты, заголовки и абзацы', async () => {
    await seed()
    const posts = stepArg<{ slug: string; text_ru: string }[]>(state.calls, 'insert:post', 'values')!
    expect(posts.map(post => post.slug)).toEqual(['ai-i-my', 'pervaya-rabota', 'sberspasibo', 'pochtabank'])
    expect(posts[0]?.text_ru).toContain('<blockquote>"Самый опасный миф')
    expect(posts[0]?.text_ru).toContain('<h3>Ловушка №1: Иллюзия эффективности</h3>')
    expect(posts[0]?.text_ru).toContain('</blockquote>\n<p>')
    expect(posts[1]?.text_ru).toContain('<p>Как нередко случается')
    expect(posts[1]?.text_ru).not.toContain(' n ')
  })

  test('назначает навыкам группу и исходный порядок в каждой группе', async () => {
    await seed()
    for (let group = 0; group < 4; group++) {
      const skills = stepArg<{ group_id: number; order: number }[]>(state.calls, 'insert:skill', 'values', group)!
      expect(skills.every(skill => skill.group_id === 41 + group)).toBe(true)
      expect(skills.map(skill => skill.order)).toEqual(skills.map((_, index) => index))
    }
    expect(console.log).toHaveBeenCalledWith('✓ skill_groups + skills')
  })

  test('ошибка вставки останавливает наполнение, логируется и завершает CLI кодом 1', async () => {
    const error = new Error('Database unavailable')
    mocks.insert.mockImplementation(() => { throw error })
    await import('~~/server/db/seed')
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledExactlyOnceWith(1))
    expect(console.error).toHaveBeenCalledExactlyOnceWith(error)
    expect(console.log).not.toHaveBeenCalledWith('Done.')
    expect(state.calls).toHaveLength(0)
  })
})
