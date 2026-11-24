/** Редактирование ограничено существующими публичными записями. */
export type ContentResource = 'pages' | 'post' | 'about' | 'settings' | 'experience' | 'education' | 'skill' | 'skill-group'
/** Токен не имеет полномочий подтверждать план. */
export type ContentScope = 'read' | 'plan' | 'apply'
/** Среда задаётся сервером, а не клиентским payload или Host. */
export type ContentEnvironment = 'development' | 'preview' | 'production'
/** Минимальные данные для выбора существующей записи. */
export interface ContentRecord { id: number; label: string }
/** Версия непрозрачна клиенту и проверяется перед созданием плана. */
export interface ContentSnapshot {
  resource: ContentResource
  recordId: number
  version: string
  data: Record<string, unknown>
}
/** Значения показываются для явного подтверждения человеком. */
export interface ContentDiff { field: string; before: unknown; after: unknown }
/** План не меняет опубликованные данные до отдельного подтверждения и применения. */
export interface ChangePlan {
  id: string
  resource: ContentResource
  recordId: number
  version: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  diff: ContentDiff[]
  expiresAt: string
  status: 'pending' | 'approved' | 'applied'
}
/** Список планов не переносит большие снимки и diff до открытия конкретного плана. */
export type ContentPlanSummary = Pick<ChangePlan, 'id' | 'resource' | 'recordId' | 'expiresAt' | 'status'>
/** История содержит только разрешённые публичные поля, без секретов. */
export interface ContentHistory {
  id: string
  resource: ContentResource
  recordId: number
  createdAt: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  actor: string
}
/** Секрет отсутствует во всех ответах, кроме однократной выдачи. */
export interface ContentTokenInfo {
  id: string
  label: string
  resources: ContentResource[]
  scopes: ContentScope[]
  expiresAt: string
  revokedAt: string | null
}
