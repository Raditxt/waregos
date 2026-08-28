import { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service'
import { ActivityService } from '../audit/audit.service'
import { loginSchema, changePasswordSchema, ChangePasswordInput } from './auth.schema'
import { JwtPayload } from '@waregos/types'
import { Prisma } from '@prisma/client'
import { ok, validationError, badRequest, notFound } from '../../shared/response'

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma)
  const activityService = new ActivityService(app.prisma)

  // POST /api/auth/login — dengan rate limit ketat
  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
        })
      }
    }
  }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const user = await authService.login(result.data)
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role
      }
      const accessToken = app.jwt.sign(payload)

      // Log aktivitas login
      await activityService.log({
        userId: user.id,
        action: 'LOGIN',
        details: { username: user.username } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.code(200).send(ok({ accessToken, user }))
    } catch (err: any) {
      return reply.code(401).send(badRequest(err.message, 'INVALID_CREDENTIALS'))
    }
  })

  // GET /api/auth/me
  app.get('/me', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload
    const user = await authService.getById(payload.sub)

    if (!user) {
      return reply.code(404).send(notFound('User'))
    }

    return reply.send(ok(user))
  })

  // PATCH /api/auth/change-password
  app.patch('/change-password', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const result = changePasswordSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const payload = request.user as JwtPayload
      await authService.changePassword(payload.sub, result.data)

      // Log aktivitas change password
      await activityService.log({
        userId: payload.sub,
        action: 'CHANGE_PASSWORD',
        ipAddress: request.ip,
      })

      return reply.send(ok(null, 'Password berhasil diubah'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah password'
      return reply.code(400).send(badRequest(message, 'CHANGE_PASSWORD_FAILED'))
    }
  })

  // PATCH /api/auth/users/:id/reset-password (admin only)
  app.patch('/users/:id/reset-password', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { newPassword } = request.body as { newPassword: string }

    if (!newPassword || newPassword.length < 6) {
      return reply.code(400).send(validationError('Password baru minimal 6 karakter'))
    }

    try {
      await authService.adminResetPassword(id, newPassword)
      return reply.send(ok(null, 'Password berhasil direset'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal reset password'
      return reply.code(400).send(badRequest(message, 'RESET_FAILED'))
    }
  })
}