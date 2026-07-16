import { PrismaClient } from '@prisma/client'
import { CreateTransactionInput, TransactionQueryInput } from './transactions.schema'
import { generateInvoiceNumber } from '@waregos/utils'

export class TransactionsService {
  constructor(private prisma: PrismaClient) {}

  async create(input: CreateTransactionInput, userId: string) {
    // 1. Validasi semua produk exist & stok cukup — dengan row-level lock (FOR UPDATE)
    const productIds = input.items.map(i => i.productId)

    // Gunakan query raw untuk mengunci baris yang dipilih
    const productsRaw = await this.prisma.$queryRaw<Array<{
      id: string
      name: string
      stock: number
      buyPrice: any
      isActive: boolean
    }>>`
      SELECT id, name, stock, buy_price as "buyPrice", is_active as "isActive"
      FROM products
      WHERE id = ANY(${productIds}::uuid[])
      AND is_active = true
      FOR UPDATE
    `

    // Konversi hasil query ke format yang diharapkan (buyPrice menjadi number)
    const products = productsRaw.map(p => ({
      ...p,
      buyPrice: Number(p.buyPrice)
    }))

    if (products.length !== productIds.length) {
      throw new Error('Satu atau lebih produk tidak ditemukan')
    }

    for (const item of input.items) {
      const product = products.find(p => p.id === item.productId)!
      if (product.stock < item.quantity) {
        throw new Error(`Stok ${product.name} tidak cukup (sisa: ${product.stock})`)
      }
    }

    // 2. Hitung total
    const totalAmount = input.items.reduce((sum, item) => {
      return sum + item.sellPrice * item.quantity
    }, 0)

    if (input.paidAmount < totalAmount) {
      throw new Error(`Uang bayar kurang. Total: ${totalAmount}, Bayar: ${input.paidAmount}`)
    }

    const changeAmount = input.paidAmount - totalAmount

    // 3. Buat transaksi + items + update stok dalam 1 transaction DB
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Buat transaksi
      const trx = await tx.transaction.create({
        data: {
          invoiceNumber: generateInvoiceNumber('TRX'),
          userId,
          paymentMethod: input.paymentMethod,
          totalAmount,
          paidAmount: input.paidAmount,
          changeAmount,
          notes: input.notes,
          items: {
            create: input.items.map(item => {
              const product = products.find(p => p.id === item.productId)!
              return {
                productId: item.productId,
                quantity: item.quantity,
                buyPrice: product.buyPrice,
                sellPrice: item.sellPrice,
                subtotal: item.sellPrice * item.quantity,
              }
            })
          }
        },
        include: {
          items: {
            include: {
              product: { select: { name: true } }
            }
          },
          user: { select: { name: true } }
        }
      })

      // Update stok & catat stock movement
      for (const item of input.items) {
        const product = products.find(p => p.id === item.productId)!
        const newStock = product.stock - item.quantity

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock }
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE_OUT',
            quantity: item.quantity,
            stockBefore: product.stock,
            stockAfter: newStock,
            transactionId: trx.id,
            userId,
          }
        })
      }

      return trx
    })

    return this.formatTransaction(transaction)
  }

  async findAll(query: TransactionQueryInput) {
    const page = Math.max(1, parseInt(query.page ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
    const skip = (page - 1) * limit

    const where: any = {}

    if (query.status) where.status = query.status
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {}
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom)
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo + 'T23:59:59Z')
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } }
          }
        }
      }),
      this.prisma.transaction.count({ where })
    ])

    return {
      data: data.map(this.formatTransaction),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }
  }

  async findById(id: string) {
    const trx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } }
        }
      }
    })
    if (!trx) return null
    return this.formatTransaction(trx)
  }

  async cancel(id: string, userId: string) {
    const trx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!trx) throw new Error('Transaksi tidak ditemukan')
    if (trx.status !== 'COMPLETED') throw new Error('Transaksi tidak bisa dibatalkan')

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id },
        data: { status: 'CANCELLED' }
      })

      // Kembalikan stok
      for (const item of trx.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) continue
        const newStock = product.stock + item.quantity

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock }
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'RETURN_IN',
            quantity: item.quantity,
            stockBefore: product.stock,
            stockAfter: newStock,
            transactionId: id,
            userId,
          }
        })
      }
    })
  }

  private formatTransaction(trx: any) {
    return {
      id: trx.id,
      invoiceNumber: trx.invoiceNumber,
      userId: trx.userId,
      userName: trx.user.name,
      status: trx.status,
      paymentMethod: trx.paymentMethod,
      totalAmount: Number(trx.totalAmount),
      paidAmount: Number(trx.paidAmount),
      changeAmount: Number(trx.changeAmount),
      notes: trx.notes,
      createdAt: trx.createdAt.toISOString(),
      items: trx.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        sellPrice: Number(item.sellPrice),
        subtotal: Number(item.subtotal),
      }))
    }
  }
}