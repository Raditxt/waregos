import { FastifyInstance } from 'fastify'

export async function catalogRoutes(app: FastifyInstance) {

  // GET /api/catalog/categories
  app.get('/categories', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const categories = await app.prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
    return reply.send({ success: true, data: categories })
  })

  // GET /api/catalog/units
  app.get('/units', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const units = await app.prisma.unit.findMany({
      orderBy: { name: 'asc' }
    })
    return reply.send({ success: true, data: units })
  })

  // POST /api/catalog/categories
  app.post('/categories', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { name } = request.body as { name: string }
    if (!name) {
      return reply.code(400).send({ success: false, error: 'VALIDATION_ERROR', message: 'Nama kategori wajib diisi' })
    }
    const category = await app.prisma.category.create({ data: { name } })
    return reply.code(201).send({ success: true, data: category })
  })

  // POST /api/catalog/units
  app.post('/units', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { name, symbol } = request.body as { name: string, symbol: string }
    if (!name || !symbol) {
      return reply.code(400).send({ success: false, error: 'VALIDATION_ERROR', message: 'Nama dan simbol unit wajib diisi' })
    }
    const unit = await app.prisma.unit.create({ data: { name, symbol } })
    return reply.code(201).send({ success: true, data: unit })
  })
}