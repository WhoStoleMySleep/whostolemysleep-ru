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

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: process.env.EMAIL,
    subject: `Сообщение от ${name} <${email}>`,
    html: `<p><strong>Имя:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Сообщение:</strong></p><p>${message}</p>`,
  })

  return { ok: true }
})
