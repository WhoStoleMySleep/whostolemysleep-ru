export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const post = await prisma.products.findFirst({
    where: { id, type: 'blog' },
    include: { images: true, tags: true },
  })

  if (!post) throw createError({ statusCode: 404, message: 'Post not found' })

  return post
})
