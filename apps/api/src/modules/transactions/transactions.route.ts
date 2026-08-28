import { FastifyInstance } from 'fastify'
import { TransactionsService } from './transactions.service'
import { ActivityService } from '../audit/audit.service'
import { createTransactionSchema, transactionQuerySchema } from './transactions.schema'
import { JwtPayload } from '@waregos/types'
import { Prisma } from '@prisma/client'
import { ok, validationError, badRequest, notFound } from '../../shared/response'

export async function transactionsRoutes(app: FastifyInstance) {
  const service = new TransactionsService(app.prisma)
  const activityService = new ActivityService(app.prisma)

  // GET /api/transactions
  app.get('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const query = transactionQuerySchema.parse(request.query)
    const result = await service.findAll(query)
    return reply.send({ success: true, data: result.data, meta: result.meta })
  })

  // GET /api/transactions/:id
  app.get('/:id', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const trx = await service.findById(id)
    if (!trx) {
      return reply.code(404).send(notFound('Transaksi'))
    }
    return reply.send(ok(trx))
  })

  // POST /api/transactions
  app.post('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const result = createTransactionSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }

    try {
      const payload = request.user as JwtPayload
      const trx = await service.create(result.data, payload.sub)

      // Log aktivitas
      await activityService.log({
        userId: payload.sub,
        action: 'CREATE_TRANSACTION',
        entityType: 'transaction',
        entityId: trx.id,
        details: { invoiceNumber: trx.invoiceNumber, totalAmount: trx.totalAmount } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })

      return reply.code(201).send(ok(trx))
    } catch (err: any) {
      return reply.code(400).send(badRequest(err.message, 'TRANSACTION_FAILED'))
    }
  })

  // PATCH /api/transactions/:id/cancel
  app.patch('/:id/cancel', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const payload = request.user as JwtPayload
      await service.cancel(id, payload.sub)

      // Log aktivitas
      await activityService.log({
        userId: payload.sub,
        action: 'CANCEL_TRANSACTION',
        entityType: 'transaction',
        entityId: id,
        ipAddress: request.ip,
      })

      return reply.send(ok(null, 'Transaksi berhasil dibatalkan'))
    } catch (err: any) {
      return reply.code(400).send(badRequest(err.message, 'CANCEL_FAILED'))
    }
  })
}