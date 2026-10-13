import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const isProd = process.env.NODE_ENV === 'production'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Environment variable "${name}" wajib diisi saat seed di produksi`)
  return value
}

async function seedUsers(): Promise<string[]> {
  if (isProd) {
    // Produksi: tidak ada akun bawaan. Admin berasal dari environment, kasir dibuat lewat aplikasi.
    const username = requireEnv('SEED_ADMIN_USERNAME').trim().toLowerCase()
    const password = requireEnv('SEED_ADMIN_PASSWORD')
    if (password.length < 12) {
      throw new Error('SEED_ADMIN_PASSWORD minimal 12 karakter di produksi')
    }

    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        name: 'Administrator',
        username,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'ADMIN',
      },
    })
    return [username]
  }

  // Dev lokal: akun contoh
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrator',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  })
  const cashier = await prisma.user.upsert({
    where: { username: 'ibu' },
    update: {},
    create: {
      name: 'Ibu',
      username: 'ibu',
      passwordHash: await bcrypt.hash('kasir123', 10),
      role: 'CASHIER',
    },
  })
  return [admin.username, cashier.username]
}

async function seedCategories(): Promise<number> {
  // Produksi: kategori dikelola lewat aplikasi, jangan muncul lagi setelah dihapus
  if (isProd) return 0

  const names = ['Minuman', 'Makanan', 'Snack', 'Rokok', 'Sembako', 'Kebersihan', 'Lainnya']
  await Promise.all(
    names.map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  )
  return names.length
}

async function seedUnits(): Promise<number> {
  const units = [
    { name: 'Pieces', symbol: 'pcs' },
    { name: 'Botol', symbol: 'btl' },
    { name: 'Bungkus', symbol: 'bks' },
    { name: 'Dus', symbol: 'dus' },
    { name: 'Kilogram', symbol: 'kg' },
    { name: 'Gram', symbol: 'gr' },
    { name: 'Liter', symbol: 'ltr' },
  ]
  await Promise.all(
    units.map((u) =>
      prisma.unit.upsert({ where: { symbol: u.symbol }, update: {}, create: u })
    )
  )
  return units.length
}

async function main() {
  console.log(`🌱 Seeding database (${isProd ? 'PRODUKSI' : 'dev'})...`)

  const users = await seedUsers()
  const categories = await seedCategories()
  const units = await seedUnits()

  console.log('✅ Users seeded:', users.join(', '))
  console.log('✅ Categories seeded:', categories)
  console.log('✅ Units seeded:', units)
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