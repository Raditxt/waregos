import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { LoginInput, ChangePasswordInput } from './auth.schema'

// Hash lama (cost 10) tetap valid karena cost tersimpan di dalam hash-nya
const BCRYPT_COST = 12
// Dipakai saat username tidak ada, supaya waktu respons sama dengan password salah
const DUMMY_HASH = bcrypt.hashSync('waregos-dummy-password', BCRYPT_COST)

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST)

// Pesan ke klien selalu sama; alasan sebenarnya hanya untuk audit log
export class LoginError extends Error {
  constructor(
    public readonly reason: 'UNKNOWN_USER' | 'WRONG_PASSWORD' | 'INACTIVE',
    public readonly userId?: string
  ) {
    super('Username atau password salah')
    this.name = 'LoginError'
  }
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
    })

    // Selalu jalankan bcrypt walau username tidak ada
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH)

    if (!user) throw new LoginError('UNKNOWN_USER')
    if (!valid) throw new LoginError('WRONG_PASSWORD', user.id)
    if (!user.isActive) throw new LoginError('INACTIVE', user.id)

    return {
      tokenVersion: user.tokenVersion,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    }
  }

  async getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })
  }

  // Mengembalikan data untuk token baru; sesi lain otomatis tidak berlaku
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User tidak ditemukan')

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!isValid) throw new Error('Password lama tidak benar')

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, username: true, role: true, tokenVersion: true },
    })
  }
}