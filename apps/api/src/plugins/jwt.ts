import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { JwtPayload } from '@waregos/types'

const unauthorized = (reply: FastifyReply) =>
  reply.code(401).send({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Token tidak valid atau sudah expired',
  })

async function jwtPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET wajib diisi') // tanpa nilai cadangan

  await app.register(jwt, {
    secret,
    sign: { algorithm: 'HS256', expiresIn: '7d' }, // jaring pengaman; auth.route menentukan per peran
    verify: { algorithms: ['HS256'] },
  })

  // Tanda tangan token valid DAN akun masih aktif DAN token belum dicabut
  const authenticateUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return unauthorized(reply)
    }

    const claims = request.user as JwtPayload
    const user = await app.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { isActive: true, role: true, tokenVersion: true },
    })

    // Akun dinonaktifkan/dihapus, atau password diganti/direset: tokenVersion berubah
    if (!user || !user.isActive || user.tokenVersion !== claims.tv) {
      return unauthorized(reply)
    }

    // Hak akses selalu mengikuti database, bukan isi token
    claims.role = user.role
  }

  app.decorate('authenticate', authenticateUser)

  app.decorate('adminOnly', async (request: FastifyRequest, reply: FastifyReply) => {
    const denied = await authenticateUser(request, reply)
    if (denied) return denied

    if ((request.user as JwtPayload).role !== 'ADMIN') {
      return reply.code(403).send({
        success: false,
        error: 'FORBIDDEN',
        message: 'Hanya admin yang bisa mengakses ini',
      })
    }
  })
}

export default fp(jwtPlugin)

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>
    adminOnly: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>
  }
}