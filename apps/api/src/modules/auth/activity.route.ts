import { FastifyInstance } from 'fastify'
import { ActivityService } from './activity.service'

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CHANGE_PASSWORD: 'Ganti Password',
  RESET_PASSWORD: 'Reset Password',
  CREATE_PRODUCT: 'Tambah Produk',
  UPDATE_PRODUCT: 'Edit Produk',
  DELETE_PRODUCT: 'Hapus Produk',
  CREATE_TRANSACTION: 'Buat Transaksi',
  CANCEL_TRANSACTION: 'Cancel Transaksi',
  CREATE_PURCHASE: 'Catat Pembelian',
  CREATE_USER: 'Tambah User',
  UPDATE_USER: 'Update User',
  ADJUST_STOCK: 'Penyesuaian Stok',
}

export async function activityRoutes(app: FastifyInstance) {
  const service = new ActivityService(app.prisma)

  // GET /api/audit/logs
  app.get('/logs', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    const { page, limit, userId, action, dateFrom, dateTo } = request.query as {
      page?: string
      limit?: string
      userId?: string
      action?: string
      dateFrom?: string
      dateTo?: string
    }

    const result = await service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
      userId,
      action,
      dateFrom,
      dateTo,
    })

    return reply.send({ success: true, ...result })
  })

  // GET /api/audit/actions — list semua action types
  app.get('/actions', {
    preHandler: [app.adminOnly]
  }, async (request, reply) => {
    return reply.send({
      success: true,
      data: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))
    })
  })
}