import { FastifyInstance } from 'fastify'
import { AuthService } from './auth.service'
import { loginSchema } from './auth.schema'
import { JwtPayload } from '@waregos/types'

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app.prisma)

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
      return reply.code(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: result.error.errors[0].message
      })
    }

    try {
      const user = await authService.login(result.data)
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        role: user.role
      }
      const accessToken = app.jwt.sign(payload)

      return reply.code(200).send({
        success: true,
        data: { accessToken, user }
      })
    } catch (err: any) {
      return reply.code(401).send({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: err.message
      })
    }
  })

  // GET /api/auth/me
  app.get('/me', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload
    const user = await authService.getById(payload.sub)

    if (!user) {
      return reply.code(404).send({
        success: false,
        error: 'NOT_FOUND',
        message: 'User tidak ditemukan'
      })
    }

    return reply.send({ success: true, data: user })
  })
}