import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'  // <-- tambahan import
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { JwtPayload } from '@waregos/types'

async function jwtPlugin(app: FastifyInstance) {
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'waregos-dev-secret-change-in-prod',
    sign: { expiresIn: '7d' }
  })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Token tidak valid atau sudah expired'
      })
    }
  })

  app.decorate('adminOnly', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as JwtPayload
      if (payload.role !== 'ADMIN') {
        reply.code(403).send({
          success: false,
          error: 'FORBIDDEN',
          message: 'Hanya admin yang bisa mengakses ini'
        })
      }
    } catch (err) {
      reply.code(401).send({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Token tidak valid atau sudah expired'
      })
    }
  })
}

export default fp(jwtPlugin)

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    adminOnly: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}