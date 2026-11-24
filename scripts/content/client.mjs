const PRODUCTION_ORIGIN = 'https://whostolemysleep.ru'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const MAX_RESPONSE_BYTES = 1024 * 1024
const MAX_REQUEST_BYTES = 128 * 1024
const REQUEST_TIMEOUT_MS = 15000
const ERROR_MESSAGES = {
  400: 'Изменение не прошло проверку полей.',
  401: 'Ключ отсутствует, отозван, истёк или относится к другой среде.',
  403: 'Нет прав на операцию, ресурс или план. Применение требует одобрения в админке.',
  404: 'Запись или план не найдены.',
  409: 'Данные изменились. Получите свежую запись и подготовьте новый план.',
  410: 'План истёк. Подготовьте новый.',
  413: 'Превышен допустимый размер изменения.',
  429: 'Превышен лимит операций. Повторите позже.',
  503: 'Запись отключена или Content API ещё не настроен.',
}

/** Адрес задаёт оператор процесса, а не аргументы инструмента или полученный контент. */
export function validateContentOrigin(baseUrl, environment) {
  const url = new URL(baseUrl)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Нужен origin без пути и credentials.')
  if (environment === 'production' && url.origin === PRODUCTION_ORIGIN) return url.origin
  if (environment === 'development' && url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname)) return url.origin
  throw new Error('Адрес не разрешён для выбранной среды. Preview-доступ через MCP выключен.')
}

async function responseJson(response) {
  if (!response.body) throw new Error('Пустой ответ Content API.')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_RESPONSE_BYTES) throw new Error('Ответ Content API слишком большой.')
      chunks.push(value)
    }
    const bytes = Buffer.concat(chunks)
    return parseResponse(bytes)
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
}

function parseResponse(bytes) {
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('Content API вернул некорректный JSON.')
  }
}

function requestOptions(token, body) {
  const serialized = body === undefined ? undefined : JSON.stringify(body)
  if (serialized && Buffer.byteLength(serialized) > MAX_REQUEST_BYTES) throw new Error('Изменение превышает 128 KiB.')
  return {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(serialized ? { 'Content-Type': 'application/json' } : {}) },
    body: serialized,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }
}

/** Клиент не раскрывает ключ, не следует редиректам и не предоставляет произвольный HTTP-запрос. */
export function createContentClient({ baseUrl, environment, token, fetchImpl = fetch }) {
  const origin = validateContentOrigin(baseUrl, environment)
  if (typeof token !== 'string' || token.length < 32 || token.length > 256 || /[^A-Za-z0-9_-]/.test(token)) throw new Error('CONTENT_API_TOKEN отсутствует или имеет недопустимый формат.')

  async function request(path, body) {
    const options = requestOptions(token, body)
    let response
    try {
      response = await fetchImpl(`${origin}/api/content/${path}`, options)
    } catch {
      throw new Error('Content API недоступен. Проверьте адрес, сеть и выбранную среду.')
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(ERROR_MESSAGES[response.status] ?? `Content API ответил HTTP ${response.status}.`)
    }
    return responseJson(response)
  }

  return {
    records: ({ resource }) => request(`records?${new URLSearchParams({ resource })}`),
    snapshot: ({ resource, recordId }) => request(`snapshot?${new URLSearchParams({ resource, recordId: String(recordId) })}`),
    plan: body => request('plan', body),
    project: body => request('projects/plan', body),
    apply: body => request('apply', body),
  }
}
