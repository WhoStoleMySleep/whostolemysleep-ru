import { describe, test, expect } from 'vitest'

describe('markdownToHtml', () => {
  test('превращает разметку в html', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('# Заголовок')).toContain('Заголовок')
    expect(markdownToHtml('**жирный**')).toContain('<strong>жирный</strong>')
  })

  test('вырезает скрипт из присланного markdown', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    const html = markdownToHtml('текст\n\n<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('текст')
  })

  test('одиночный перевод строки не становится <br> — breaks выключен', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('первая\nвторая')).not.toContain('<br')
  })

  test('пустой ввод даёт пустую строку', async () => {
    const { markdownToHtml } = await import('~~/server/utils/markdown')
    expect(markdownToHtml('')).toBe('')
  })
})

describe('excerptFromHtml', () => {
  test('снимает теги и лишние пробелы', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>Первый</p>\n<p>  Второй  </p>')).toBe('Первый Второй')
  })

  test('&nbsp; превращается в обычный пробел', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>а&nbsp;б</p>')).toBe('а б')
  })

  test('текст ровно по лимиту не обрезается и без многоточия', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    const text = 'a'.repeat(10)
    expect(excerptFromHtml(`<p>${text}</p>`, 10)).toBe(text)
  })

  test('длинный текст режется по последнему пробелу, не по середине слова', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>один два три</p>', 9)).toBe('один два…')
  })

  test('слово длиннее лимита режется как есть — резать больше негде', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('<p>ммммммммммм</p>', 5)).toBe('ммммм…')
  })

  test('пустой html даёт пустой анонс', async () => {
    const { excerptFromHtml } = await import('~~/server/utils/markdown')
    expect(excerptFromHtml('')).toBe('')
  })
})
