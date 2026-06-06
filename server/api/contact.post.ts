import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, email, message } = body

  if (!name || !email || !message) {
    throw createError({ statusCode: 400, message: 'Все поля обязательны' })
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  })

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  await transporter.sendMail({
    from:    process.env.EMAIL,
    to:      process.env.EMAIL,
    replyTo: email,
    subject: `Сообщение от ${name} <${email}>`,
    html: `<p><strong>Имя:</strong> ${escape(name)}</p><p><strong>Email:</strong> ${escape(email)}</p><p><strong>Сообщение:</strong></p><p>${escape(message)}</p>`,
  })

  return { ok: true }
})
