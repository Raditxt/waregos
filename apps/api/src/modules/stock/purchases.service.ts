import { PrismaClient } from '@prisma/client'
import { CreatePurchaseInput, PurchaseQueryInput } from './purchases.schema'
import { generateInvoiceNumber } from '@waregos/utils'

export class PurchasesService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreatePurchaseInput, userId: string) {
    const productIds = input.items.map(i => i.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true }
    })

    if (products.length !== productIds.length) {
      throw new Error('Satu atau lebih produk tidak ditemukan')
    }

    const totalAmount = input.items.reduce((sum, item) => {
      return sum + item.buyPrice * item.quantity
    }, 0)

    const purchase = await this.prisma.$transaction(async (tx) => {
      const prc = await tx.purchase.create({
        data: {
          invoiceNumber: generateInvoiceNumber('PRC'),
          supplierId: input.supplierId,
          userId,
          totalAmount,
          notes: input.notes,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
          items: {
            create: input.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              buyPrice: item.buyPrice,
              subtotal: item.buyPrice * item.quantity,
            }))
          }
        },
        include: {
          items: {
            include: { product: { select: { name: true } } }
          },
          supplier: { select: { name: true } },
          user: { select: { name: true } }
        }
      })

      // Update stok & harga beli + catat stock movement
      for (const item of input.items) {
        const product = products.find(p => p.id === item.productId)!
        const newStock = product.stock + item.quantity

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            buyPrice: item.buyPrice,
          }
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'PURCHASE_IN',
            quantity: item.quantity,
            stockBefore: product.stock,
            stockAfter: newStock,
            purchaseId: prc.id,
            userId,
          }
        })
      }

      return prc
    })

    return this.formatPurchase(purchase)
  }

  async findAll(query: PurchaseQueryInput) {
    const page = Math.max(1, parseInt(query.page ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
    const skip = (page - 1) * limit

    const where: any = {}
    if (query.dateFrom || query.dateTo) {
      where.purchasedAt = {}
      if (query.dateFrom) where.purchasedAt.gte = new Date(query.dateFrom)
      if (query.dateTo) where.purchasedAt.lte = new Date(query.dateTo + 'T23:59:59Z')
    }

    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchasedAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
          user: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } }
          }
        }
      }),
      this.prisma.purchase.count({ where })
    ])

    return {
      data: data.map(this.formatPurchase),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }
  }

  async findById(id: string) {
    const prc = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } }
        }
      }
    })
    if (!prc) return null
    return this.formatPurchase(prc)
  }

  private formatPurchase(prc: any) {
    return {
      id: prc.id,
      invoiceNumber: prc.invoiceNumber,
      supplierId: prc.supplierId,
      supplierName: prc.supplier?.name ?? null,
      userId: prc.userId,
      userName: prc.user.name,
      status: prc.status,
      totalAmount: Number(prc.totalAmount),
      notes: prc.notes,
      purchasedAt: prc.purchasedAt.toISOString(),
      createdAt: prc.createdAt.toISOString(),
      items: prc.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        subtotal: Number(item.subtotal),
      }))
    }
  }
}