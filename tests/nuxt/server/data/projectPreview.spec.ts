import { describe, expect, test } from 'vitest'

describe('Локальный черновик кейса', () => {
  test.each(['ru', 'en'] as const)('содержит описание, вклад, решение и реальные экраны для %s', async (locale) => {
    const { projectPreview } = await import('~~/server/data/projectPreview')
    const project = projectPreview(locale)
    expect(project.slug).toBe('preview-personal-site')
    expect(project.type).toBe('project')
    expect(project.title).toBeTruthy()
    expect(project.excerpt).toBeTruthy()
    expect(project.text.match(/<h2>/g)).toHaveLength(4)
    expect(project.tags.map(tag => tag.name)).toEqual(['Nuxt', 'Vue', 'TypeScript', 'PostgreSQL'])
    expect(project.images).toHaveLength(2)
    expect(project.images.every(image => image.alt && image.url.startsWith('/project-preview/'))).toBe(true)
  })

  test('создаёт независимые данные и не смешивает переводы', async () => {
    const { projectPreview } = await import('~~/server/data/projectPreview')
    const ru = projectPreview('ru')
    const en = projectPreview('en')
    expect(ru.title).not.toBe(en.title)
    expect(ru.text).toContain('Что я сделал')
    expect(en.text).toContain('What I built')
    ru.tags.pop()
    expect(projectPreview('ru').tags).toHaveLength(4)
  })
})
