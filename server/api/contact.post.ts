import nodemailer from 'nodemailer'

const RATE_LIMIT  = 3
const RATE_WINDOW = 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
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
