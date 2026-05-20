export default defineEventHandler(async () => {
  const about = await prisma.aboutMe.findFirst()
  return about
})
