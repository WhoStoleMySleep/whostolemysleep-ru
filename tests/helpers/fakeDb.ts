import { getTableName, is, Table } from 'drizzle-orm'

export interface DbCall {
  op:    string
  table: string
  steps: { m: string; args: unknown[] }[]
}

/** План ответов: ключ — `${операция}:${таблица}`, значение — ответы по порядку await'ов. */
export type DbResults = Record<string, unknown[][]>

export interface FakeDbState {
  results: DbResults
  calls:   DbCall[]
  cursor:  Record<string, number>
  /** Строки для db.query.<таблица>: ключ — имя из схемы (aboutMe, skillGroup). */
  rows?:   Record<string, unknown[]>
}

/**
 * Заглушка drizzle: цепочка методов любой длины, а await отдаёт ответ из плана
 * по ключу «операция:таблица». Ключ вместо позиции в очереди — потому что часть
 * запросов в коде условная, и сдвиг очереди ломался бы от любой ветки.
 *
 * Ответы для ключа берутся по порядку; когда остаётся последний, он повторяется.
 * Ключ без плана отвечает пустым списком.
 */
export function makeFakeDb(state: FakeDbState): unknown {
  return new Proxy({} as Record<string, unknown>, {
    get(_, op) {
      if (op === 'query') return queryApi(state)
      return (...args: unknown[]) => chain(state, String(op), args)
    },
  })
}

function queryApi(state: FakeDbState): unknown {
  return new Proxy({} as Record<string, unknown>, {
    get: (_, table) => ({
      findFirst: async () => state.rows?.[String(table)]?.[0],
      findMany:  async () => state.rows?.[String(table)] ?? [],
    }),
  })
}

/** Сбрасывает план и журнал — вызывать в beforeEach. */
export function plan(state: FakeDbState, results: DbResults = {}, rows: Record<string, unknown[]> = {}): void {
  state.results = results
  state.calls   = []
  state.cursor  = {}
  state.rows    = rows
}

function chain(state: FakeDbState, op: string, args: unknown[]): unknown {
  const call: DbCall = { op, table: tableOf(args) ?? '?', steps: [{ m: op, args }] }

  const proxy: unknown = new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      if (prop === 'then') {
        state.calls.push(call)
        return (resolve: (v: unknown) => unknown) => Promise.resolve(answer(state, call)).then(resolve)
      }
      return (...next: unknown[]) => {
        call.steps.push({ m: String(prop), args: next })
        if (call.table === '?') call.table = tableOf(next) ?? '?'
        return proxy
      }
    },
  })

  return proxy
}

function answer(state: FakeDbState, call: DbCall): unknown[] {
  const key  = `${call.op}:${call.table}`
  const list = state.results[key]
  if (!list?.length) return []

  const at = state.cursor[key] ?? 0
  state.cursor[key] = Math.min(at + 1, list.length - 1)
  return list[at] ?? []
}

function tableOf(args: unknown[]): string | null {
  for (const arg of args) {
    if (is(arg, Table)) return getTableName(arg)
  }
  return null
}

/** Находит запрос в журнале и отдаёт аргумент нужного шага цепочки. */
export function stepArg<T = unknown>(calls: DbCall[], key: string, method: string, nth = 0): T | undefined {
  const matches = calls.filter((c) => `${c.op}:${c.table}` === key)
  const call    = matches[nth]
  return call?.steps.find((s) => s.m === method)?.args[0] as T | undefined
}
