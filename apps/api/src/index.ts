import 'dotenv/config';

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

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import prismaPlugin from './plugins/prisma';
import jwtPlugin from './plugins/jwt';
import corsPlugin from './plugins/cors';
import { globalErrorHandler } from './shared/error-handler';
import { logger } from './shared/logger';
import { Bonjour } from 'bonjour-service';

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

// Railway membuang/merutekan ulang X-Forwarded-For dari edge proxy-nya.
// Alih-alih memercayai semua proxy (true) yang rawan X-Forwarded-For spoofing,
// kita hanya memercayai rentang CIDR spesifik yang diketahui.
// 152.233.0.0/16 ditambahkan berdasarkan observasi IP hop di log Railway.
const trustProxy: boolean | string[] =
  process.env.TRUST_PROXY === 'true' || Number(process.env.TRUST_PROXY_HOPS ?? 0) > 0
    ? ['127.0.0.1', '::1', '10.0.0.0/8', '100.0.0.0/8', '152.233.0.0/16', '172.16.0.0/12', '192.168.0.0/16']
    : false;

const app = Fastify({
  logger: false, // Pakai custom logger
  trustProxy,
});

const start = async () => {
  try {
    // Global error handler
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

    // mDNS hanya berguna di jaringan lokal (dev), tidak di cloud
    let bonjour: Bonjour | null = null;
    if (!isProd) {
      bonjour = new Bonjour();
      bonjour.publish({
        name: 'Waregos API',
        type: 'http',
        port: port,
        txt: { version: '1.0.0' },
      });
      logger.info('📡 mDNS broadcasting as waregos-api.local', 'Bootstrap');
    }

    // Railway menghentikan proses dengan SIGTERM; Ctrl+C di lokal adalah SIGINT
    const shutdown = async (signal: string) => {
      logger.info(`${signal} diterima, menutup server...`, 'Bootstrap');
      bonjour?.unpublishAll();
      bonjour?.destroy();
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