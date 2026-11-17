import 'dotenv/config';
import { trustProxyFromEnv } from './shared/trust-proxy';

const isProd = process.env.NODE_ENV === 'production';

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL', ...(isProd ? ['CORS_ORIGINS'] : [])];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ FATAL: Environment variable "${envVar}" is required but not set.`);
    process.exit(1);
  }
}
if (isProd && (process.env.JWT_SECRET as string).length < 32) {
  console.error('❌ FATAL: JWT_SECRET minimal 32 karakter di produksi.');
  process.exit(1);
}
// Proxy tepercaya untuk X-Forwarded-For (ADR 0008). Wajib diisi di produksi.
let trustProxy: string[] | false;
try {
  trustProxy = trustProxyFromEnv(process.env);
} catch (err) {
  console.error(`❌ FATAL: ${(err as Error).message}`);
  process.exit(1);
}

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from './plugins/prisma';
import jwtPlugin from './plugins/jwt';
import corsPlugin from './plugins/cors';
import { globalErrorHandler } from './shared/error-handler';
import { BODY_LIMIT_BYTES } from './shared/body-limit';
import { logger } from './shared/logger';

// Routes
import { authRoutes } from './modules/auth/auth.route';
import { usersRoutes } from './modules/users/users.route';
import { productsRoutes } from './modules/products/products.route';
import { catalogRoutes } from './modules/catalog/catalog.route';
import { transactionsRoutes } from './modules/transactions/transactions.route';
import { purchasesRoutes } from './modules/stock/purchases.route';
import { reportsRoutes } from './modules/reports/reports.route';
import { debtRoutes } from './modules/debt/debt.route';
import { activityRoutes } from './modules/audit/audit.route';
import { stockRoutes } from './modules/stock/stock.route';


const app = Fastify({
  logger: false, // Pakai custom logger
  trustProxy,
  bodyLimit: BODY_LIMIT_BYTES, // 64 KiB; alasan ukurannya ada di shared/body-limit.ts
});

const start = async () => {
  try {
    app.setErrorHandler(globalErrorHandler);

    // Plugins
    await app.register(prismaPlugin);
    await app.register(helmet, { crossOriginResourcePolicy: { policy: 'cross-origin' } });
    await app.register(jwtPlugin);
    await app.register(corsPlugin);
    await app.register(rateLimit, {
      global: false,
      max: 100,
      timeWindow: '1 minute',
    });

    // Routes
    await app.register(authRoutes, { prefix: '/api/auth' });
    await app.register(usersRoutes, { prefix: '/api/users' });
    await app.register(productsRoutes, { prefix: '/api/products' });
    await app.register(catalogRoutes, { prefix: '/api/catalog' });
    await app.register(transactionsRoutes, { prefix: '/api/transactions' });
    await app.register(purchasesRoutes, { prefix: '/api/purchases' });
    await app.register(reportsRoutes, { prefix: '/api/reports' });
    await app.register(debtRoutes, { prefix: '/api/debts' });
    await app.register(activityRoutes, { prefix: '/api/audit' });
    await app.register(stockRoutes, { prefix: '/api/stock' });

    // Health check
    app.get('/health', async (request, reply) => {
      try {
        await app.prisma.$queryRaw`SELECT 1`;
        return reply.send({
          status: 'ok',
          service: 'waregos-api',
          database: 'connected',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(process.uptime()),
        });
      } catch {
        return reply.code(503).send({
          status: 'error',
          service: 'waregos-api',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(process.uptime()),
        });
      }
    });

    const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
    const host = process.env.API_HOST ?? '0.0.0.0';

    await app.listen({ port, host });
    logger.info(`🚀 Waregos API running at http://${host}:${port}`, 'Bootstrap');

    const shutdown = async (signal: string) => {
      logger.info(`${signal} diterima, menutup server...`, 'Bootstrap');
      await app.close();
      process.exit(0);
    };
    process.on('SIGINT', () => { void shutdown('SIGINT'); });
    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  } catch (err) {
    logger.error('Failed to start server', 'Bootstrap', err);
    process.exit(1);
  }
};

start();