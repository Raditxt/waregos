import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ok, validationError, badRequest, notFound } from '../../shared/response'

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

export async function usersRoutes(app: FastifyInstance) {

  // GET /api/users — list semua user (admin only)
  app.get('/', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const users = await app.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    return reply.send(ok(users))
  })

  // PATCH /api/users/:id — update user (admin only)
  app.patch('/:id', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateUserSchema.safeParse(request.body)

    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const user = await app.prisma.user.update({
        where: { id },
        data: result.data,
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          isActive: true,
          updatedAt: true,
        }
      })
      return reply.send(ok(user))
    } catch {
      return reply.code(404).send(notFound('User'))
    }
  })

  // PATCH /api/users/:id/reset-password — admin reset password
  app.patch('/:id/reset-password', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { newPassword } = request.body as { newPassword: string }

    if (!newPassword || newPassword.length < 6) {
      return reply.code(400).send(validationError('Password baru minimal 6 karakter'))
    }

    try {
      const hash = await bcrypt.hash(newPassword, 10)
      await app.prisma.user.update({
        where: { id },
        data: { passwordHash: hash }
      })
      return reply.send(ok(null, 'Password berhasil direset'))
    } catch {
      return reply.code(404).send(notFound('User'))
    }
  })

  // POST /api/users — tambah user baru (admin only)
  app.post('/', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const createSchema = z.object({
      name: z.string().min(1).max(100),
      username: z.string().min(3).max(50),
      password: z.string().min(6),
      role: z.enum(['ADMIN', 'CASHIER']).default('CASHIER'),
    })

    const result = createSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const hash = await bcrypt.hash(result.data.password, 10)
      const user = await app.prisma.user.create({
        data: {
          name: result.data.name,
          username: result.data.username,
          passwordHash: hash,
          role: result.data.role,
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
        }
      })
      return reply.code(201).send(ok(user))
    } catch {
      return reply.code(409).send(badRequest('Username sudah digunakan', 'CONFLICT'))
    }
  })
}