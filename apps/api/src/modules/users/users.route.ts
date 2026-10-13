import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { JwtPayload } from '@waregos/types'
import { ActivityService } from '../audit/audit.service'
import { hashPassword } from '../auth/auth.service'
import { usernameSchema, passwordSchema } from '../auth/auth.schema'
import { ok, validationError, badRequest, notFound } from '../../shared/response'

const updateUserSchema = z.object({
  name: z.string().trim().min(1, { message: 'Nama wajib diisi' }).max(100).optional(),
  isActive: z.boolean().optional(),
})

const createUserSchema = z.object({
  name: z.string().trim().min(1, { message: 'Nama wajib diisi' }).max(100),
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(['ADMIN', 'CASHIER']).default('CASHIER'),
})

const resetPasswordSchema = z.object({ newPassword: passwordSchema })

const userSelect = {
  id: true,
  name: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

const isPrismaError = (err: unknown, code: string) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code

export async function usersRoutes(app: FastifyInstance) {
  const activityService = new ActivityService(app.prisma)

  // GET /api/users — list semua user (admin only)
  app.get('/', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const users = await app.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: userSelect,
    })
    return reply.send(ok(users))
  })

  // PATCH /api/users/:id — update user (admin only)
  app.patch('/:id', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const actor = request.user as JwtPayload
    const result = updateUserSchema.safeParse(request.body)

    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    // Pelaku selalu admin aktif, jadi selama tidak menonaktifkan diri sendiri
    // dipastikan masih ada minimal satu admin aktif.
    if (result.data.isActive === false && id === actor.sub) {
      return reply.code(400).send(
        badRequest('Kamu tidak bisa menonaktifkan akunmu sendiri', 'SELF_DEACTIVATE')
      )
    }

    try {
      const user = await app.prisma.user.update({
        where: { id },
        data: {
          ...result.data,
          // Menonaktifkan akun = langsung mencabut semua sesinya
          ...(result.data.isActive === false && { tokenVersion: { increment: 1 } }),
        },
        select: userSelect,
      })

      await activityService.log({
        userId: actor.sub,
        action: 'UPDATE_USER',
        entityType: 'user',
        entityId: id,
        details: result.data as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.send(ok(user))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) return reply.code(404).send(notFound('User'))
      throw err
    }
  })

  // PATCH /api/users/:id/reset-password — admin reset password
  app.patch('/:id/reset-password', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const actor = request.user as JwtPayload
    const result = resetPasswordSchema.safeParse(request.body)

    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      await app.prisma.user.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(result.data.newPassword),
          tokenVersion: { increment: 1 }, // semua sesi lama berakhir
        },
      })

      await activityService.log({
        userId: actor.sub,
        action: 'RESET_PASSWORD',
        entityType: 'user',
        entityId: id,
        ipAddress: request.ip,
      })

      return reply.send(ok(null, 'Password berhasil direset'))
    } catch (err) {
      if (isPrismaError(err, 'P2025')) return reply.code(404).send(notFound('User'))
      throw err
    }
  })

  // POST /api/users — tambah user baru (admin only)
  app.post('/', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const actor = request.user as JwtPayload
    const result = createUserSchema.safeParse(request.body)

    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const user = await app.prisma.user.create({
        data: {
          name: result.data.name,
          username: result.data.username,
          passwordHash: await hashPassword(result.data.password),
          role: result.data.role,
        },
        select: userSelect,
      })

      await activityService.log({
        userId: actor.sub,
        action: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        details: { username: user.username, role: user.role } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.code(201).send(ok(user))
    } catch (err) {
      if (isPrismaError(err, 'P2002')) {
        return reply.code(409).send(badRequest('Username sudah digunakan', 'CONFLICT'))
      }
      throw err
    }
  })
}