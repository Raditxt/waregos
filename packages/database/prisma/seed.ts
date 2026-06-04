import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Hash passwords
  const adminHash = await bcrypt.hash('admin123', 10)
  const cashierHash = await bcrypt.hash('kasir123', 10)

  // Seed users
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash: adminHash,
      role: 'ADMIN'
    }
  })

  const cashier = await prisma.user.upsert({
    where: { username: 'ibu' },
    update: {},
    create: {
      name: 'Ibu',
      username: 'ibu',
      passwordHash: cashierHash,
      role: 'CASHIER'
    }
  })

  // Seed categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Minuman' }, update: {}, create: { name: 'Minuman' } }),
    prisma.category.upsert({ where: { name: 'Makanan' }, update: {}, create: { name: 'Makanan' } }),
    prisma.category.upsert({ where: { name: 'Snack' }, update: {}, create: { name: 'Snack' } }),
    prisma.category.upsert({ where: { name: 'Rokok' }, update: {}, create: { name: 'Rokok' } }),
    prisma.category.upsert({ where: { name: 'Sembako' }, update: {}, create: { name: 'Sembako' } }),
    prisma.category.upsert({ where: { name: 'Kebersihan' }, update: {}, create: { name: 'Kebersihan' } }),
    prisma.category.upsert({ where: { name: 'Lainnya' }, update: {}, create: { name: 'Lainnya' } }),
  ])

  // Seed units
  const units = await Promise.all([
    prisma.unit.upsert({ where: { symbol: 'pcs' }, update: {}, create: { name: 'Pieces', symbol: 'pcs' } }),
    prisma.unit.upsert({ where: { symbol: 'btl' }, update: {}, create: { name: 'Botol', symbol: 'btl' } }),
    prisma.unit.upsert({ where: { symbol: 'bks' }, update: {}, create: { name: 'Bungkus', symbol: 'bks' } }),
    prisma.unit.upsert({ where: { symbol: 'dus' }, update: {}, create: { name: 'Dus', symbol: 'dus' } }),
    prisma.unit.upsert({ where: { symbol: 'kg' }, update: {}, create: { name: 'Kilogram', symbol: 'kg' } }),
    prisma.unit.upsert({ where: { symbol: 'gr' }, update: {}, create: { name: 'Gram', symbol: 'gr' } }),
    prisma.unit.upsert({ where: { symbol: 'ltr' }, update: {}, create: { name: 'Liter', symbol: 'ltr' } }),
  ])

  console.log('✅ Users seeded:', admin.username, cashier.username)
  console.log('✅ Categories seeded:', categories.length)
  console.log('✅ Units seeded:', units.length)
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })