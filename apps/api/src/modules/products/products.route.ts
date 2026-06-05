import { FastifyInstance } from 'fastify'
import { ProductsService } from './products.service'
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schema'

export async function productsRoutes(app: FastifyInstance) {
  const service = new ProductsService(app.prisma)

  // GET /api/products
  app.get('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const query = productQuerySchema.parse(request.query)
    const result = await service.findAll(query)
    return reply.send({ success: true, ...result })
  })

  // GET /api/products/low-stock
  app.get('/low-stock', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const data = await service.getLowStock()
    return reply.send({ success: true, data })
  })

  // GET /api/products/barcode/:barcode
  app.get('/barcode/:barcode', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { barcode } = request.params as { barcode: string }
    const product = await service.findByBarcode(barcode)
    if (!product) {
      return reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Produk tidak ditemukan' })
    }
    return reply.send({ success: true, data: product })
  })

  // GET /api/products/:id
  app.get('/:id', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const product = await service.findById(id)
    if (!product) {
      return reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Produk tidak ditemukan' })
    }
    return reply.send({ success: true, data: product })
  })

  // POST /api/products
  app.post('/', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const result = createProductSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: result.error.errors[0].message
      })
    }
    const product = await service.create(result.data)
    return reply.code(201).send({ success: true, data: product })
  })

  // PATCH /api/products/:id
  app.patch('/:id', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateProductSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: result.error.errors[0].message
      })
    }
    try {
      const product = await service.update(id, result.data)
      return reply.send({ success: true, data: product })
    } catch {
      return reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Produk tidak ditemukan' })
    }
  })

  // DELETE /api/products/:id (soft delete)
  app.delete('/:id', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await service.delete(id)
      return reply.send({ success: true, message: 'Produk berhasil dihapus' })
    } catch {
      return reply.code(404).send({ success: false, error: 'NOT_FOUND', message: 'Produk tidak ditemukan' })
    }
  })
}