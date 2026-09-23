import { buildSnapshot } from '~~/server/utils/cv'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'Export the whole resume as one file',
    description: 'diff and apply accept the same format.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'A resume snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/CvSnapshot' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          CvSnapshot: {
            type: 'object',
            required: ['version', 'about', 'experience', 'education', 'skills'],
            properties: {
              version: { type: 'integer' },
              about:   { type: 'object', properties: { text_ru: { type: 'string' }, text_en: { type: 'string' } } },
              experience: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    company_ru:  { type: 'string' },
                    company_en:  { type: 'string' },
                    position_ru: { type: 'string' },
                    position_en: { type: 'string' },
                    date_from:   { type: 'string', format: 'date' },
                    date_to:     { type: 'string', format: 'date', nullable: true },
                    bullets:     { type: 'array', items: { type: 'object', properties: { text_ru: { type: 'string' }, text_en: { type: 'string' } } } },
                  },
                },
              },
              education: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    institution:       { type: 'string' },
                    specialization_ru: { type: 'string' },
                    specialization_en: { type: 'string' },
                    date_from:         { type: 'string', format: 'date' },
                    date_to:           { type: 'string', format: 'date', nullable: true },
                  },
                },
              },
              skills: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    slug:    { type: 'string' },
                    name_ru: { type: 'string' },
                    name_en: { type: 'string' },
                    items:   { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          CvChange: {
            type: 'object',
            properties: {
              id:       { type: 'string' },
              section:  { type: 'string', enum: ['about', 'experience', 'education', 'skills'] },
              kind:     { type: 'string', enum: ['add', 'update', 'remove'] },
              label:    { type: 'string' },
              field:    { type: 'string' },
              before:   { type: ['string', 'array', 'object', 'null'], description: 'The current value' },
              after:    { type: ['string', 'array', 'object', 'null'], description: 'The value from the file' },
              editable: { type: 'boolean', description: 'A scalar field can be edited before it is applied' },
            },
          },
        },
      },
    },
  },
})

/** The resume as one file — which is also the template for importing it back. */
export default defineEventHandler(async () => buildSnapshot())
