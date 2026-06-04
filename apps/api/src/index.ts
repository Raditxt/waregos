import Fastify from 'fastify'
import 'dotenv/config'

import prismaPlugin from './plugins/prisma'
import jwtPlugin from './plugins/jwt'
import corsPlugin from './plugins/cors'
import { authRoutes } from './modules/auth/auth.route'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

const start = async () => {
  try {
    // Plugins
    await app.register(prismaPlugin)
    await app.register(jwtPlugin)
    await app.register(corsPlugin)

    // Routes
    await app.register(authRoutes, { prefix: '/api/auth' })

    // Health check
    app.get('/health', async () => ({
      status: 'ok',
      service: 'waregos-api',
      timestamp: new Date().toISOString()
    }))

    await app.listen({
      port: Number(process.env.API_PORT ?? 3001),
      host: process.env.API_HOST ?? '0.0.0.0'
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()