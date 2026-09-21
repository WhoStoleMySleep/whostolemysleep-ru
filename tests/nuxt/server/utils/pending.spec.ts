import { describe, test, expect } from 'vitest'

describe('withLocales', () => {
  test('путь без локали разворачивается в обе — реальных маршрутов у страницы два', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/blog')).toEqual(['/ru/blog', '/en/blog'])
  })

  test('корень превращается в /ru и /en, а не в /ru/', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/')).toEqual(['/ru', '/en'])
  })

  test('путь с уже готовым префиксом остаётся один', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    expect(withLocales('/ru/contacts')).toEqual(['/ru/contacts'])
    expect(withLocales('/en')).toEqual(['/en'])
  })

  test('совпадение по префиксу только целым сегментом', async () => {
    const { withLocales } = await import('~~/server/utils/pending')
    // «/ruby» начинается на «ru», но локалью от этого не становится.
    expect(withLocales('/ruby')).toEqual(['/ru/ruby', '/en/ruby'])
  })
})

describe('postPaths', () => {
  test('без слага — только списки, которые меняются от любой записи', async () => {
    const { postPaths } = await import('~~/server/utils/pending')
    expect(postPaths()).toEqual(['/', '/blog', '/projects'])
  })

  test('со слагом добавляется страница самой записи', async () => {
    const { postPaths } = await import('~~/server/utils/pending')
    expect(postPaths('hello')).toContain('/blog/hello')
  })
})

describe('resumePaths', () => {
  test('печатная версия устаревает вместе с резюме', async () => {
    const { resumePaths } = await import('~~/server/utils/pending')
    expect(resumePaths()).toEqual(['/', '/resume', '/cv'])
  })
})
