import { FastifyInstance } from 'fastify';
import { PurchasesService, PurchaseError } from './purchases.service';
import { ActivityService } from '../audit/audit.service';
import { createPurchaseSchema, purchaseQuerySchema } from './purchases.schema';
import { JwtPayload } from '@waregos/types';
import { Prisma } from '@prisma/client';
import { ok, validationError, badRequest, notFound } from '../../shared/response';

export async function purchasesRoutes(app: FastifyInstance) {
  const service = new PurchasesService(app.prisma);
  const activityService = new ActivityService(app.prisma);

  // GET /api/purchases (memuat harga beli: admin saja)
  app.get('/', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const query = purchaseQuerySchema.parse(request.query);
    const result = await service.findAll(query);
    return reply.send({ success: true, data: result.data, meta: result.meta });
  });

  // GET /api/purchases/:id (admin saja)
  app.get('/:id', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const prc = await service.findById(id);
    if (!prc) {
      return reply.code(404).send(notFound('Purchase'));
    }
    return reply.send(ok(prc));
  });

  // POST /api/purchases (admin saja)
  app.post('/', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const result = createPurchaseSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message));
    }
    try {
      const payload = request.user as JwtPayload;
      const prc = await service.create(result.data, payload.sub);

      await activityService.log({
        userId: payload.sub,
        action: 'CREATE_PURCHASE',
        entityType: 'purchase',
        entityId: prc.id,
        details: {
          invoiceNumber: prc.invoiceNumber,
          kind: prc.kind,
          totalAmount: prc.totalAmount,
          itemCount: prc.items.length,
        } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      });

      return reply.code(201).send(ok(prc));
    } catch (err: unknown) {
      // Hanya pesan validasi bisnis yang ditampilkan; error tak terduga ke penangan global
      if (err instanceof PurchaseError) {
        return reply.code(400).send(badRequest(err.message, 'PURCHASE_FAILED'));
      }
      throw err;
    }
  });
}