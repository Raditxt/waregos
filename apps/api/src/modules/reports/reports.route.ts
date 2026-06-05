import { FastifyInstance } from 'fastify'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '@waregos/utils'

export async function reportsRoutes(app: FastifyInstance) {

  // GET /api/reports/summary?date=2026-06-05
  app.get('/summary', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { date } = request.query as { date?: string }
    const target = date ? new Date(date) : new Date()
    const from = startOfDay(target)
    const to = endOfDay(target)

    const transactions = await app.prisma.transaction.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: 'COMPLETED'
      },
      include: {
        items: true
      }
    })

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0)
    const totalProfit = transactions.reduce((sum, t) => {
      const profit = t.items.reduce((s, item) => {
        return s + (Number(item.sellPrice) - Number(item.buyPrice)) * item.quantity
      }, 0)
      return sum + profit
    }, 0)
    const totalItemsSold = transactions.reduce((sum, t) => {
      return sum + t.items.reduce((s, item) => s + item.quantity, 0)
    }, 0)

    return reply.send({
      success: true,
      data: {
        date: target.toISOString().slice(0, 10),
        totalTransactions: transactions.length,
        totalRevenue,
        totalProfit,
        totalItemsSold,
      }
    })
  })

  // GET /api/reports/monthly?year=2026&month=6
  app.get('/monthly', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { year, month } = request.query as { year?: string, month?: string }
    const target = new Date(
      parseInt(year ?? String(new Date().getFullYear())),
      parseInt(month ?? String(new Date().getMonth() + 1)) - 1,
      1
    )
    const from = startOfMonth(target)
    const to = endOfMonth(target)

    const transactions = await app.prisma.transaction.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: 'COMPLETED'
      },
      include: { items: true }
    })

    // Group by date
    const byDate: Record<string, any> = {}
    for (const t of transactions) {
      const d = t.createdAt.toISOString().slice(0, 10)
      if (!byDate[d]) {
        byDate[d] = { date: d, totalTransactions: 0, totalRevenue: 0, totalProfit: 0, totalItemsSold: 0 }
      }
      byDate[d].totalTransactions += 1
      byDate[d].totalRevenue += Number(t.totalAmount)
      byDate[d].totalItemsSold += t.items.reduce((s, i) => s + i.quantity, 0)
      byDate[d].totalProfit += t.items.reduce((s, i) => {
        return s + (Number(i.sellPrice) - Number(i.buyPrice)) * i.quantity
      }, 0)
    }

    const totalRevenue = transactions.reduce((s, t) => s + Number(t.totalAmount), 0)
    const totalProfit = transactions.reduce((s, t) => {
      return s + t.items.reduce((si, i) => si + (Number(i.sellPrice) - Number(i.buyPrice)) * i.quantity, 0)
    }, 0)

    return reply.send({
      success: true,
      data: {
        year: target.getFullYear(),
        month: target.getMonth() + 1,
        totalTransactions: transactions.length,
        totalRevenue,
        totalProfit,
        daily: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
      }
    })
  })

  // GET /api/reports/top-products?limit=10&dateFrom=2026-06-01&dateTo=2026-06-30
  app.get('/top-products', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { limit, dateFrom, dateTo } = request.query as {
      limit?: string, dateFrom?: string, dateTo?: string
    }

    const where: any = { transaction: { status: 'COMPLETED' } }
    if (dateFrom || dateTo) {
      where.transaction = {
        ...where.transaction,
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59Z') }),
        }
      }
    }

    const items = await app.prisma.transactionItem.findMany({
      where,
      include: {
        product: { select: { name: true, unit: { select: { symbol: true } } } }
      }
    })

    // Aggregate by product
    const byProduct: Record<string, any> = {}
    for (const item of items) {
      const pid = item.productId
      if (!byProduct[pid]) {
        byProduct[pid] = {
          productId: pid,
          productName: item.product.name,
          unit: item.product.unit.symbol,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
        }
      }
      byProduct[pid].totalQuantity += item.quantity
      byProduct[pid].totalRevenue += Number(item.sellPrice) * item.quantity
      byProduct[pid].totalProfit += (Number(item.sellPrice) - Number(item.buyPrice)) * item.quantity
    }

    const sorted = Object.values(byProduct)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, parseInt(limit ?? '10'))

    return reply.send({ success: true, data: sorted })
  })

  // GET /api/reports/stock-movements?productId=xxx&limit=20
  app.get('/stock-movements', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const { productId, limit } = request.query as { productId?: string, limit?: string }

    const movements = await app.prisma.stockMovement.findMany({
      where: productId ? { productId } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit ?? '50'),
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      }
    })

    return reply.send({
      success: true,
      data: movements.map(m => ({
        id: m.id,
        productId: m.productId,
        productName: m.product.name,
        type: m.type,
        quantity: m.quantity,
        stockBefore: m.stockBefore,
        stockAfter: m.stockAfter,
        userId: m.userId,
        userName: m.user.name,
        notes: m.notes,
        createdAt: m.createdAt.toISOString(),
      }))
    })
  })
}