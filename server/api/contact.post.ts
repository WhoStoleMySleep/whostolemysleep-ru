import nodemailer from 'nodemailer'

const RATE_LIMIT  = 3
const RATE_WINDOW = 60 * 60 * 1000

defineRouteMeta({
  openAPI: {
    tags:        ['Public'],
    summary:     'Send a message from the contact form',
    description: 'At most three messages per address per hour. The website field is a bot trap: if it is filled in, the request is rejected.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'email', 'message'],
            properties: {
              name:    { type: 'string' },
              email:   { type: 'string', format: 'email' },
              message: { type: 'string' },
              website: { type: 'string', description: 'Honeypot, must stay empty' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      429: { $ref: '#/components/responses/TooManyRequests' },
    },
  },
})

export default defineEventHandler(async (event) => {
  // clientIp reads the platform header, not whatever the client sent.
  const ip = clientIp(event)
  const allowed = await checkRateLimit(`contact:${ip}`, RATE_LIMIT, RATE_WINDOW)
  if (!allowed) throw createError({ statusCode: 429, message: 'rate_limit' })

  const { name, email, message, website } = await readBody(event)
  if (website) throw createError({ statusCode: 400, message: 'bad_request' })
  if (!name || !email || !message) throw createError({ statusCode: 400, message: 'required' })

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  await nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
  }).sendMail({
    from: process.env.EMAIL, to: process.env.EMAIL, replyTo: email,
    subject: `Сообщение от ${name} <${email}>`,
    html: `<p><strong>Имя:</strong> ${escape(name)}</p><p><strong>Email:</strong> ${escape(email)}</p><p><strong>Сообщение:</strong></p><p>${escape(message)}</p>`,
  })

  return { ok: true }
})
