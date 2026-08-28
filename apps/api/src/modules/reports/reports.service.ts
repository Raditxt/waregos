// ============================================
// REPORTS SERVICE — Single Responsibility
// All reporting business logic in one place
// ============================================

import { PrismaClient } from '@prisma/client'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from '@waregos/utils'
import { logger } from '../../shared/logger'

export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDailySummary(date: Date) {
    const from = startOfDay(date)
    const to = endOfDay(date)

    logger.debug(`Fetching daily summary for ${date.toISOString().slice(0, 10)}`, 'ReportsService')

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      include: { items: true },
    })

    const cancelled = await this.prisma.transaction.count({
      where: { createdAt: { gte: from, lte: to }, status: 'CANCELLED' },
    })

    return this.calculateSummary(transactions, cancelled, date)
  }

  async getClosing(date: Date) {
    const from = startOfDay(date)
    const to = endOfDay(date)

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      include: { items: true },
    })

    const cancelled = await this.prisma.transaction.count({
      where: { createdAt: { gte: from, lte: to }, status: 'CANCELLED' },
    })

    const byMethod = this.groupByPaymentMethod(transactions)
    const { totalRevenue, totalProfit, totalItems } = this.calculateTotals(transactions)

    const lastTransaction = await this.prisma.transaction.findFirst({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true, createdAt: true, totalAmount: true },
    })

    return {
      date: date.toISOString().slice(0, 10),
      totalTransactions: transactions.length,
      cancelledTransactions: cancelled,
      totalRevenue,
      totalProfit,
      totalItems,
      expectedCash: byMethod.CASH.total,
      byPaymentMethod: byMethod,
      lastTransaction: lastTransaction ? {
        invoiceNumber: lastTransaction.invoiceNumber,
        createdAt: lastTransaction.createdAt.toISOString(),
        totalAmount: Number(lastTransaction.totalAmount),
      } : null,
    }
  }

  async getMonthly(year: number, month: number) {
    const target = new Date(year, month - 1, 1)
    const from = startOfMonth(target)
    const to = endOfMonth(target)

    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      include: { items: true },
    })

    const byDate = this.groupByDate(transactions)
    const { totalRevenue, totalProfit } = this.calculateTotals(transactions)

    return {
      year,
      month,
      totalTransactions: transactions.length,
      totalRevenue,
      totalProfit,
      daily: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    }
  }

  async getTopProducts(limit: number, dateFrom?: string, dateTo?: string) {
    const where: any = { transaction: { status: 'COMPLETED' } }

    if (dateFrom || dateTo) {
      where.transaction = {
        ...where.transaction,
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo + 'T23:59:59Z') }),
        },
      }
    }

    const items = await this.prisma.transactionItem.findMany({
      where,
      include: {
        product: { select: { name: true, unit: { select: { symbol: true } } } },
      },
    })

    return this.aggregateByProduct(items, limit)
  }

  async getStockMovements(productId?: string, limit = 50) {
    const movements = await this.prisma.stockMovement.findMany({
      where: productId ? { productId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: { select: { name: true } },
        user: { select: { name: true } },
      },
    })

    return movements.map(m => ({
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
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private calculateSummary(transactions: any[], cancelled: number, date: Date) {
    const { totalRevenue, totalProfit, totalItems } = this.calculateTotals(transactions)
    return {
      date: date.toISOString().slice(0, 10),
      totalTransactions: transactions.length,
      cancelledTransactions: cancelled,
      totalRevenue,
      totalProfit,
      totalItemsSold: totalItems,
    }
  }

  private calculateTotals(transactions: any[]) {
    let totalRevenue = 0
    let totalProfit = 0
    let totalItems = 0

    for (const t of transactions) {
      totalRevenue += Number(t.totalAmount)
      totalItems += t.items.reduce((s: number, i: any) => s + i.quantity, 0)
      totalProfit += t.items.reduce((s: number, i: any) =>
        s + (Number(i.sellPrice) - Number(i.buyPrice)) * i.quantity, 0
      )
    }

    return { totalRevenue, totalProfit, totalItems }
  }

  private groupByPaymentMethod(transactions: any[]) {
    const byMethod: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      TRANSFER: { count: 0, total: 0 },
      QRIS: { count: 0, total: 0 },
      DEBT: { count: 0, total: 0 },
    }

    for (const t of transactions) {
      const method = t.paymentMethod as string
      if (byMethod[method]) {
        byMethod[method].count += 1
        byMethod[method].total += Number(t.totalAmount)
      }
    }

    return byMethod
  }

  private groupByDate(transactions: any[]) {
    const byDate: Record<string, any> = {}

    for (const t of transactions) {
      const d = t.createdAt.toISOString().slice(0, 10)
      if (!byDate[d]) {
        byDate[d] = {
          date: d,
          totalTransactions: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalItemsSold: 0,
        }
      }
      byDate[d].totalTransactions += 1
      byDate[d].totalRevenue += Number(t.totalAmount)
      byDate[d].totalItemsSold += t.items.reduce((s: number, i: any) => s + i.quantity, 0)
      byDate[d].totalProfit += t.items.reduce((s: number, i: any) =>
        s + (Number(i.sellPrice) - Number(i.buyPrice)) * i.quantity, 0
      )
    }

    return byDate
  }

  private aggregateByProduct(items: any[], limit: number) {
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
      byProduct[pid].totalProfit +=
        (Number(item.sellPrice) - Number(item.buyPrice)) * item.quantity
    }

    return Object.values(byProduct)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit)
  }
}