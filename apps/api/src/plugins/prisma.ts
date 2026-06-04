import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function prismaPlugin(app: FastifyInstance) {
  await prisma.$connect()
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
}

export default fp(prismaPlugin)

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}