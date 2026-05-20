export default defineEventHandler(async () => {
  const skills = await prisma.skills.findFirst()
  return skills
})
