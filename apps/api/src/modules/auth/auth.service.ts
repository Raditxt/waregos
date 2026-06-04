import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { LoginInput } from './auth.schema'

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
}