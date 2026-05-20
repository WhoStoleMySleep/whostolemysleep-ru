export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')

  if (type !== 'experience' && type !== 'education') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const items = await prisma.inform.findMany({
    where: { type },
    include: { InformDetails: true },
    orderBy: { date: 'desc' },
  })

  return items
})
