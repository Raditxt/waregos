import { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { JwtPayload } from '@waregos/types'
import { CatalogService, CatalogError } from './catalog.service'
import { categoryBodySchema } from './catalog.schema'
import { ActivityService } from '../audit/audit.service'
import { ok, validationError, badRequest, notFound } from '../../shared/response'

export async function catalogRoutes(app: FastifyInstance) {
  const service = new CatalogService(app.prisma)
  const activityService = new ActivityService(app.prisma)

  // Error bisnis yang kita lempar sendiri → pesan spesifik.
  // Error tak terduga → dilempar ulang ke global error handler (500 + log).
  const handleCatalogError = (err: unknown, reply: FastifyReply) => {
    if (err instanceof CatalogError) {
      if (err.statusCode === 404) {
        return reply.code(404).send(notFound('Kategori'))
      }
      const code = err.statusCode === 409 ? 'CONFLICT' : 'CATALOG_FAILED'
      return reply.code(err.statusCode).send(badRequest(err.message, code))
    }
    throw err
  }

  // ─── GET /api/catalog/categories ────────────────────────────
  app.get('/categories', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const data = await service.getCategories()
    return reply.send(ok(data))
  })

  // ─── POST /api/catalog/categories ───────────────────────────
  app.post('/categories', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const parsed = categoryBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(validationError(parsed.error.errors[0].message))
    }
    try {
      const data = await service.createCategory(parsed.data.name)
      const payload = request.user as JwtPayload
      await activityService.log({
        userId: payload.sub,
        action: 'CREATE_CATEGORY',
        entityType: 'category',
        entityId: data.id,
        details: { name: data.name } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })
      return reply.code(201).send(ok(data))
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  // ─── PATCH /api/catalog/categories/:id ──────────────────────
  app.patch('/categories/:id', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = categoryBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(validationError(parsed.error.errors[0].message))
    }
    try {
      const data = await service.updateCategory(id, parsed.data.name)
      const payload = request.user as JwtPayload
      await activityService.log({
        userId: payload.sub,
        action: 'UPDATE_CATEGORY',
        entityType: 'category',
        entityId: id,
        details: { name: data.name } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })
      return reply.send(ok(data))
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  // ─── DELETE /api/catalog/categories/:id ─────────────────────
  app.delete('/categories/:id', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const deleted = await service.deleteCategory(id)
      const payload = request.user as JwtPayload
      await activityService.log({
        userId: payload.sub,
        action: 'DELETE_CATEGORY',
        entityType: 'category',
        entityId: id,
        details: { name: deleted.name } as Prisma.InputJsonValue,
        ipAddress: request.ip,
      })
      return reply.send(ok(null, 'Kategori berhasil dihapus'))
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  // ─── UNITS (tidak berubah) ──────────────────────────────────
  app.get('/units', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const data = await service.getUnits()
    return reply.send(ok(data))
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