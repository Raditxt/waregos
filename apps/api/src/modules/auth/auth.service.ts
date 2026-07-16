import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { LoginInput, ChangePasswordInput } from './auth.schema'

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username }
    })

    if (!user || !user.isActive) {
      throw new Error('Username atau password salah')
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new Error('Username atau password salah')
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString()
    }
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    return user
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User tidak ditemukan')

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!isValid) throw new Error('Password lama tidak benar')

    const newHash = await bcrypt.hash(input.newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    })
  }

  async adminResetPassword(targetUserId: string, newPassword: string) {
    const newHash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: newHash }
    })
  }
}