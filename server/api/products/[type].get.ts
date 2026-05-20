export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')

  if (type !== 'blog' && type !== 'project') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const products = await prisma.products.findMany({
    where: { type },
    include: { images: true, tags: true },
    orderBy: { date: 'desc' },
  })

  return products
})
