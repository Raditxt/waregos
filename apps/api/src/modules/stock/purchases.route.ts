import { FastifyInstance } from 'fastify'
import { PurchasesService } from './purchases.service'
import { createPurchaseSchema, purchaseQuerySchema } from './purchases.schema'
import { JwtPayload } from '@waregos/types'

export async function purchasesRoutes(app: FastifyInstance) {
  const service = new PurchasesService(app.prisma)

  // GET /api/purchases
  app.get('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const query = purchaseQuerySchema.parse(request.query)
    const result = await service.findAll(query)
    return reply.send({ success: true, ...result })
  })

  // GET /api/purchases/:id
  app.get('/:id', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const prc = await service.findById(id)
    if (!prc) {
      return reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Purchase tidak ditemukan' })
    }
    return reply.send({ success: true, data: prc })
  })

  // POST /api/purchases
  app.post('/', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const result = createPurchaseSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: result.error.errors[0].message
      })
    }
    try {
      const payload = request.user as JwtPayload
      const prc = await service.create(result.data, payload.sub)
      return reply.code(201).send({ success: true, data: prc })
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: 'PURCHASE_FAILED',
        message: err.message
      })
    }
  })
}