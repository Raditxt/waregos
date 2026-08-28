import { FastifyInstance } from 'fastify'
import { DebtService } from './debt.service'
import { JwtPayload } from '@waregos/types'
import { z } from 'zod'
import { ok, validationError, badRequest } from '../../shared/response'

const addDebtSchema = z.object({
  customerName: z.string().min(1, { message: 'Nama pelanggan wajib diisi' }),
  amount: z.number().positive({ message: 'Jumlah hutang harus lebih dari 0' }),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })).optional(),
  notes: z.string().optional(),
})

const paymentSchema = z.object({
  customerName: z.string().min(1),
  amount: z.number().positive({ message: 'Jumlah bayar harus lebih dari 0' }),
  notes: z.string().optional(),
})

export async function debtRoutes(app: FastifyInstance) {
  const service = new DebtService(app.prisma)

  // GET /api/debts — summary semua hutang
  app.get('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const data = await service.getSummary()
    return reply.send(ok(data))
  })

  // GET /api/debts/search?q=sari — autocomplete nama
  app.get('/search', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { q } = request.query as { q?: string }
    const data = await service.searchCustomers(q ?? '')
    return reply.send(ok(data))
  })

  // GET /api/debts/:customerName — riwayat hutang per pelanggan
  app.get('/:customerName', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { customerName } = request.params as { customerName: string }
    const data = await service.getHistory(decodeURIComponent(customerName))
    return reply.send(ok(data))
  })

  // POST /api/debts — catat hutang baru
  app.post('/', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const result = addDebtSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }
    try {
      const payload = request.user as JwtPayload
      await service.addDebt({
        ...result.data,
        createdBy: payload.sub,
      })
      return reply.code(201).send(ok(null, 'Hutang berhasil dicatat'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mencatat hutang'
      return reply.code(400).send(badRequest(message, 'DEBT_FAILED'))
    }
  })

  // POST /api/debts/payment — catat pembayaran
  app.post('/payment', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const result = paymentSchema.safeParse(request.body)
    if (!result.success) {
      return reply.code(400).send(validationError(result.error.errors[0].message))
    }
    try {
      const payload = request.user as JwtPayload
      await service.addPayment({
        ...result.data,
        createdBy: payload.sub,
      })
      return reply.send(ok(null, 'Pembayaran hutang berhasil dicatat'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mencatat pembayaran'
      return reply.code(400).send(badRequest(message, 'PAYMENT_FAILED'))
    }
  })
}