import 'dotenv/config'

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ FATAL: Environment variable "${envVar}" is required but not set.`)
    process.exit(1)
  }
}

import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import prismaPlugin from './plugins/prisma'
import jwtPlugin from './plugins/jwt'
import corsPlugin from './plugins/cors'
import { globalErrorHandler } from './shared/error-handler'
import { logger } from './shared/logger'

// Routes
import { authRoutes } from './modules/auth/auth.route'
import { usersRoutes } from './modules/users/users.route'
import { productsRoutes } from './modules/products/products.route'
import { catalogRoutes } from './modules/products/catalog.route'
import { transactionsRoutes } from './modules/transactions/transactions.route'
import { purchasesRoutes } from './modules/stock/purchases.route'
import { reportsRoutes } from './modules/reports/reports.route'
import { debtRoutes } from './modules/debt/debt.route'
import { activityRoutes } from './modules/audit/audit.route'

const app = Fastify({
  logger: false, // Pakai custom logger
})

const start = async () => {
  try {
    // Global error handler
    app.setErrorHandler(globalErrorHandler)

    // Plugins
    await app.register(prismaPlugin)
    await app.register(jwtPlugin)
    await app.register(corsPlugin)
    await app.register(rateLimit, {
      global: false,
      max: 100,
      timeWindow: '1 minute',
    })

    // Routes
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.register(usersRoutes, { prefix: '/api/users' })
    await app.register(productsRoutes, { prefix: '/api/products' })
    await app.register(catalogRoutes, { prefix: '/api/catalog' })
    await app.register(transactionsRoutes, { prefix: '/api/transactions' })
    await app.register(purchasesRoutes, { prefix: '/api/purchases' })
    await app.register(reportsRoutes, { prefix: '/api/reports' })
    await app.register(debtRoutes, { prefix: '/api/debts' })
    await app.register(activityRoutes, { prefix: '/api/audit' })

    // Health check
    app.get('/health', async (request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`
        return reply.send({
          status: 'ok',
          service: 'waregos-api',
          database: 'connected',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(process.uptime()),
        })
      } catch {
        return reply.code(503).send({
          status: 'error',
          service: 'waregos-api',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(process.uptime()),
        })
      }
    })

    const port = Number(process.env.API_PORT ?? 3001)
    const host = process.env.API_HOST ?? '0.0.0.0'

    await app.listen({ port, host })
    logger.info(`🚀 Waregos API running at http://${host}:${port}`, 'Bootstrap')
  } catch (err) {
    logger.error('Failed to start server', 'Bootstrap', err)
    process.exit(1)
  }
}

start()