import { FastifyInstance } from 'fastify';
import { ProductsService, ProductNotFoundError } from './products.service';
import { ActivityService } from '../audit/audit.service';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from './products.schema';
import { JwtPayload } from '@waregos/types';
import { Prisma } from '@prisma/client';
import { ok, validationError, notFound, badRequest } from '../../shared/response';

export async function productsRoutes(app: FastifyInstance) {
  const activityService = new ActivityService(app.prisma);

  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const service = new ProductsService(app.prisma, payload.role);
    const query = productQuerySchema.parse(request.query);
    const result = await service.findAll(query);
    return reply.send({ success: true, data: result.data, meta: result.meta });
  });

  app.get('/low-stock', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const service = new ProductsService(app.prisma, payload.role);
    const data = await service.getLowStock();
    return reply.send(ok(data));
  });

  app.get('/expiring-soon', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const service = new ProductsService(app.prisma, payload.role);
    const data = await service.getExpiringSoon();
    return reply.send(ok(data));
  });

  app.get('/dead-stock', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const { days } = request.query as { days?: string };
    const service = new ProductsService(app.prisma, 'ADMIN');
    const data = await service.getDeadStock(days ? Number(days) : 30);
    return reply.send(ok(data));
  });

  app.get('/barcode/:barcode', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const service = new ProductsService(app.prisma, payload.role);
    const { barcode } = request.params as { barcode: string };
    const product = await service.findByBarcode(barcode);
    if (!product) {
      return reply.code(404).send(notFound('Produk'));
    }
    return reply.send(ok(product));
  });

  app.get('/:id/price-history', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const history = await app.prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, username: true } },
      },
    });

    return reply.send(
      ok(
        history.map((h) => ({
          id: h.id,
          oldPrice: Number(h.oldPrice),
          newPrice: Number(h.newPrice),
          changedBy: h.user.name,
          username: h.user.username,
          reason: h.reason,
          createdAt: h.createdAt.toISOString(),
        }))
      )
    );
  });

  app.get('/:id/purchase-history', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const lines = await app.prisma.purchaseItem.findMany({
      where: { productId: id, purchase: { status: 'RECEIVED' } },
      orderBy: { purchase: { purchasedAt: 'desc' } },
      take: 20,
      include: {
        purchase: {
          select: {
            invoiceNumber: true,
            kind: true,
            purchasedAt: true,
            supplierRef: true,
            supplier: { select: { name: true } },
          },
        },
      },
    });

    return reply.send(
      ok(
        lines.map((l) => ({
          id: l.id,
          invoiceNumber: l.purchase.invoiceNumber,
          kind: l.purchase.kind,
          purchasedAt: l.purchase.purchasedAt.toISOString(),
          supplierName: l.purchase.supplier?.name ?? null,
          supplierRef: l.purchase.supplierRef,
          quantity: l.quantity,
          buyPrice: Number(l.buyPrice),
          expiryDate: l.expiryDate ? l.expiryDate.toISOString().slice(0, 10) : null,
        }))
      )
    );
  });

  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const service = new ProductsService(app.prisma, payload.role);
    const { id } = request.params as { id: string };
    const product = await service.findById(id);
    if (!product) {
      return reply.code(404).send(notFound('Produk'));
    }
    return reply.send(ok(product));
  });

  app.post('/', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const service = new ProductsService(app.prisma, 'ADMIN');
    const result = createProductSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message));
    }
    const product = await service.create(result.data);

    const payload = request.user as JwtPayload;
    await activityService.log({
      userId: payload.sub,
      action: 'CREATE_PRODUCT',
      entityType: 'product',
      entityId: product.id,
      details: { name: product.name } as Prisma.InputJsonValue,
      ipAddress: request.ip,
    });

    return reply.code(201).send(ok(product));
  });

  app.patch('/:id', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const payload = request.user as JwtPayload;

    const result = updateProductSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message));
    }

    try {
      const service = new ProductsService(app.prisma, 'ADMIN');
      const product = await service.update(id, result.data);

      await activityService.log({
        userId: payload.sub,
        action: 'UPDATE_PRODUCT',
        entityType: 'product',
        entityId: id,
        ipAddress: request.ip,
      });

      return reply.send(ok(product));
    } catch (err: unknown) {
      if (err instanceof ProductNotFoundError) {
        return reply.code(404).send(notFound('Produk'));
      }
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      request.log.error({ err, productId: id }, 'Failed to update product');
      return reply.code(400).send(badRequest(message, 'UPDATE_FAILED'));
    }
  });

  app.delete('/:id', { preHandler: [app.adminOnly] }, async (request, reply) => {
    const service = new ProductsService(app.prisma, 'ADMIN');
    const { id } = request.params as { id: string };

    try {
      await service.delete(id);

      const payload = request.user as JwtPayload;
      await activityService.log({
        userId: payload.sub,
        action: 'DELETE_PRODUCT',
        entityType: 'product',
        entityId: id,
        ipAddress: request.ip,
      });

      return reply.send(ok(null, 'Produk berhasil dihapus'));
    } catch (err: unknown) {
      if (err instanceof ProductNotFoundError) {
        return reply.code(404).send(notFound('Produk'));
      }
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      request.log.error({ err, productId: id }, 'Failed to delete product');
      return reply.code(400).send(badRequest(message, 'DELETE_FAILED'));
    }
  });
}