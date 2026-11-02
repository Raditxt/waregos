import { FastifyInstance } from 'fastify'
import { ReportsService } from './reports.service'
import { ok, validationError } from '../../shared/response'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseDate(value: string | undefined): Date | null {
  if (value === undefined) return new Date()
  if (!DATE_PATTERN.test(value)) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10) === value ? date : null
}

function parseLimit(value: string | undefined, fallback: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isInteger(n) || n < 1) return fallback
  return Math.min(n, max)
}

export async function reportsRoutes(app: FastifyInstance) {
  const service = new ReportsService(app.prisma)

  app.get('/summary', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { date } = request.query as { date?: string }
    const target = parseDate(date)
    if (!target) {
      return reply.code(400).send(validationError('Tanggal harus berformat YYYY-MM-DD'))
    }
    const data = await service.getDailySummary(target)
    return reply.send(ok(data))
  })

  app.get('/closing', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { date } = request.query as { date?: string }
    const target = parseDate(date)
    if (!target) {
      return reply.code(400).send(validationError('Tanggal harus berformat YYYY-MM-DD'))
    }
    const data = await service.getClosing(target)
    return reply.send(ok(data))
  })

  app.get('/monthly', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { year, month } = request.query as { year?: string; month?: string }
    const now = new Date()
    const y = Number.parseInt(year ?? String(now.getFullYear()), 10)
    const m = Number.parseInt(month ?? String(now.getMonth() + 1), 10)
    if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) {
      return reply.code(400).send(validationError('Tahun atau bulan tidak valid'))
    }
    const data = await service.getMonthly(y, m)
    return reply.send(ok(data))
  })

  app.get('/top-products', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { limit, dateFrom, dateTo } = request.query as {
      limit?: string
      dateFrom?: string
      dateTo?: string
    }
    if ((dateFrom && !parseDate(dateFrom)) || (dateTo && !parseDate(dateTo))) {
      return reply.code(400).send(validationError('Tanggal harus berformat YYYY-MM-DD'))
    }
    const data = await service.getTopProducts(parseLimit(limit, 10, 100), dateFrom, dateTo)
    return reply.send(ok(data))
  })

  app.get('/stock-movements', {
    preHandler: [app.adminOnly],
  }, async (request, reply) => {
    const { productId, limit } = request.query as {
      productId?: string
      limit?: string
    }
    const data = await service.getStockMovements(productId, parseLimit(limit, 50, 200))
    return reply.send(ok(data))
  })
}