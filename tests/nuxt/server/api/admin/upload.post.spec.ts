import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'

const mocks = vi.hoisted(() => ({ put: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: mocks.put }))

type UploadPart = { name: string; data: Buffer; filename?: string; type?: string }
const png = Buffer.from('89504e470d0a1a0a', 'hex')

async function upload(parts: UploadPart[] | undefined) {
  vi.stubGlobal('readMultipartFormData', async () => parts)
  const { default: handler } = await import('~~/server/api/admin/upload.post')
  return (handler as (event: H3Event) => Promise<{ url: string }>)({} as H3Event)
}

beforeEach(() => {
  mocks.put.mockReset().mockResolvedValue({ url: 'https://images.test/stored' })
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'storage-token')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Загрузка изображений', () => {
  test.each([
    ['png', png],
    ['jpg', Buffer.from('ffd8ff', 'hex')],
    ['gif', Buffer.from('GIF89a')],
    ['gif', Buffer.from('GIF8')],
    ['gif', Buffer.from('c7c9c6b8', 'hex')],
    ['webp', Buffer.from('RIFF0000WEBP')],
    ['webp', Buffer.from('d2c9c6c630303030d7c5c2d0', 'hex')],
  ])('определяет %s по сигнатуре, игнорируя заявленный тип и расширение', async (ext, data) => {
    expect(await upload([{ name: 'file', filename: '../photo.html', type: 'text/html', data }]))
      .toEqual({ url: 'https://images.test/stored' })
    expect(mocks.put).toHaveBeenCalledWith(`photo.${ext}`, data, {
      access: 'public', contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      addRandomSuffix: true, token: 'storage-token',
    })
  })

  test.each([undefined, [], [{ name: 'file', data: Buffer.alloc(0) }], [{ name: 'other', data: png }]])(
    'отклоняет отсутствующий или пустой файл: %j', async parts => {
      await expect(upload(parts)).rejects.toMatchObject({ statusCode: 400 })
      expect(mocks.put).not.toHaveBeenCalled()
    },
  )

  test.each(['89504e470d0a1a', 'ffd8', '474946', '5249464630303030574542', '3c68746d6c3e'])('отклоняет неполную или неподдерживаемую сигнатуру %s', async hex => {
    await expect(upload([{ name: 'file', data: Buffer.from(hex, 'hex') }])).rejects.toMatchObject({ statusCode: 415 })
    expect(mocks.put).not.toHaveBeenCalled()
  })

  test('принимает ровно 8 МБ и отклоняет превышение до обращения к Blob', async () => {
    const data = Buffer.alloc(8 * 1024 * 1024)
    png.copy(data)
    await upload([{ name: 'file', data }])
    expect(mocks.put).toHaveBeenCalledTimes(1)
    mocks.put.mockClear()
    await expect(upload([{ name: 'file', data: Buffer.concat([data, Buffer.alloc(1)]) }]))
      .rejects.toMatchObject({ statusCode: 413, message: 'File is larger than 8 MB' })
    expect(mocks.put).not.toHaveBeenCalled()
  })

  test.each([
    [undefined, 'upload.png'],
    ['C:\\pictures\\имя файла.png', 'upload.png'],
    ['/tmp/a.b   c.jpg', 'a-b-c.png'],
    [`${'a'.repeat(70)}.jpg`, `${'a'.repeat(60)}.png`],
  ])('очищает имя %s без изменения содержимого', async (filename, name) => {
    await upload([{ name: 'file', filename, data: png }])
    expect(mocks.put).toHaveBeenCalledWith(name, png, expect.any(Object))
  })

  test('не скрывает ошибку хранилища', async () => {
    mocks.put.mockRejectedValue(new Error('Storage unavailable'))
    await expect(upload([{ name: 'file', data: png }])).rejects.toThrow('Storage unavailable')
  })
})
