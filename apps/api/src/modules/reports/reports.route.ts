// ============================================
// REPORTS ROUTE — Thin Controller
// Only handles HTTP concerns, delegates to service
// ============================================

import { FastifyInstance } from 'fastify'
import { ReportsService } from './reports.service'
import { ok, notFound } from '../../shared/response'

export async function reportsRoutes(app: FastifyInstance) {
  const service = new ReportsService(app.prisma)

  // GET /api/reports/summary?date=2026-08-05
  app.get('/summary', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { date } = request.query as { date?: string }
    const target = date ? new Date(date) : new Date()
    const data = await service.getDailySummary(target)
    return reply.send(ok(data))
  })

  // GET /api/reports/closing?date=2026-08-05
  app.get('/closing', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { date } = request.query as { date?: string }
    const target = date ? new Date(date) : new Date()
    const data = await service.getClosing(target)
    return reply.send(ok(data))
  })

  // GET /api/reports/monthly?year=2026&month=8
  app.get('/monthly', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { year, month } = request.query as { year?: string; month?: string }
    const now = new Date()
    const data = await service.getMonthly(
      parseInt(year ?? String(now.getFullYear())),
      parseInt(month ?? String(now.getMonth() + 1))
    )
    return reply.send(ok(data))
  })

  // GET /api/reports/top-products
  app.get('/top-products', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { limit, dateFrom, dateTo } = request.query as {
      limit?: string
      dateFrom?: string
      dateTo?: string
    }
    const data = await service.getTopProducts(
      parseInt(limit ?? '10'),
      dateFrom,
      dateTo
    )
    return reply.send(ok(data))
  })

  // GET /api/reports/stock-movements
  app.get('/stock-movements', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { productId, limit } = request.query as {
      productId?: string
      limit?: string
    }
    const data = await service.getStockMovements(
      productId,
      parseInt(limit ?? '50')
    )
    return reply.send(ok(data))
  })
}