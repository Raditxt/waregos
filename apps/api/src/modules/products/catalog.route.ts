import { FastifyInstance } from 'fastify'
import { CatalogService } from './catalog.service'
import { ok, validationError } from '../../shared/response'

export async function catalogRoutes(app: FastifyInstance) {
  const service = new CatalogService(app.prisma)

  app.get('/categories', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const data = await service.getCategories()
    return reply.send(ok(data))
  })

  app.get('/units', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const data = await service.getUnits()
    return reply.send(ok(data))
  })

  app.post('/categories', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { name } = request.body as { name: string }
    if (!name) return reply.code(400).send(validationError('Nama kategori wajib diisi'))
    const data = await service.createCategory(name)
    return reply.code(201).send(ok(data))
  })

  app.post('/units', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { name, symbol } = request.body as { name: string; symbol: string }
    if (!name || !symbol) {
      return reply.code(400).send(validationError('Nama dan simbol unit wajib diisi'))
    }
    const data = await service.createUnit(name, symbol)
    return reply.code(201).send(ok(data))
  })
}