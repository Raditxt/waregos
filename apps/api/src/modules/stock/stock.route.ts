import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { JwtPayload } from '@waregos/types'
import { StockService, StockError } from './stock.service'
import { ActivityService } from '../audit/audit.service'
import { adjustStockSchema, correctCostSchema } from './stock.schema'
import { ok, validationError, badRequest } from '../../shared/response'

export async function stockRoutes(app: FastifyInstance) {
  const service = new StockService(app.prisma)
  const activityService = new ActivityService(app.prisma)

  // POST /api/stock/adjustments (admin saja)
  app.post('/adjustments', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const parsed = adjustStockSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(validationError(parsed.error.errors[0].message))
    }
    try {
      const payload = request.user as JwtPayload
      const result = await service.adjust(parsed.data, payload.sub)

      await activityService.log({
        userId: payload.sub,
        action: 'ADJUST_STOCK',
        entityType: 'product',
        entityId: parsed.data.productId,
        details: {
          product: result.productName,
          direction: result.direction,
          quantity: result.quantity,
          reason: result.reason,
          stockBefore: result.stockBefore,
          stockAfter: result.stockAfter,
          unitCost: result.unitCost,
          notes: parsed.data.notes ?? null,
        } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.code(201).send(ok(result))
    } catch (err: unknown) {
      if (err instanceof StockError) {
        return reply.code(400).send(badRequest(err.message, 'STOCK_FAILED'))
      }
      throw err
    }
  })

  // POST /api/stock/cost-corrections (admin saja)
  app.post('/cost-corrections', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const parsed = correctCostSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(validationError(parsed.error.errors[0].message))
    }
    try {
      const payload = request.user as JwtPayload
      const result = await service.correctCost(parsed.data, payload.sub)

      await activityService.log({
        userId: payload.sub,
        action: 'CORRECT_COST',
        entityType: 'product',
        entityId: parsed.data.productId,
        details: {
          product: result.productName,
          oldCost: result.oldCost,
          newCost: result.newCost,
          reason: parsed.data.reason,
        } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.code(201).send(ok(result))
    } catch (err: unknown) {
      if (err instanceof StockError) {
        return reply.code(400).send(badRequest(err.message, 'COST_CORRECTION_FAILED'))
      }
      throw err
    }
  })
}