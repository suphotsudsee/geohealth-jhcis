import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123!', 12)

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: hash, isActive: true },
    create: {
      username: 'admin',
      passwordHash: hash,
      displayName: 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin user ready:', user.username, '| role:', user.role)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
