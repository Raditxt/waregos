import { PrismaClient, Prisma, StockMovementType } from '@prisma/client'
import { AdjustStockInput, CorrectCostInput } from './stock.schema'

export class StockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StockError'
  }
}

type ProductRow = { name: string; stock: number; buy_price: Prisma.Decimal | null }

const TX_OPTIONS = { maxWait: 5000, timeout: 20000 }

export class StockService {
  constructor(private readonly prisma: PrismaClient) {}


  async adjust(input: AdjustStockInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const isOut = input.direction === 'OUT'

      const rows = isOut
        ? await tx.$queryRaw<ProductRow[]>`
            UPDATE products
            SET stock = stock - ${input.quantity}::int,
                updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${input.productId} AND is_active = true AND stock >= ${input.quantity}::int
            RETURNING name, stock, buy_price
          `
        : await tx.$queryRaw<ProductRow[]>`
            UPDATE products
            SET stock = stock + ${input.quantity}::int,
                updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${input.productId} AND is_active = true
            RETURNING name, stock, buy_price
          `

      if (rows.length !== 1) {
        const p = await tx.product.findUnique({
          where: { id: input.productId },
          select: { name: true, stock: true, isActive: true },
        })
        if (!p || !p.isActive) throw new StockError('Produk tidak ditemukan')
        throw new StockError(`Stok ${p.name} tidak cukup (sisa: ${p.stock})`)
      }

      const row = rows[0]
      const stockAfter = Number(row.stock)
      const stockBefore = isOut ? stockAfter + input.quantity : stockAfter - input.quantity
      const unitCost = row.buy_price === null ? null : Number(row.buy_price)

      const movement = await tx.stockMovement.create({
        data: {
          productId: input.productId,
          type: isOut ? StockMovementType.ADJUSTMENT_OUT : StockMovementType.ADJUSTMENT_IN,
          quantity: input.quantity,
          stockBefore,
          stockAfter,
          reason: input.reason,
          unitCost,
          notes: input.notes,
          userId,
        },
        select: { id: true },
      })

      return {
        movementId: movement.id,
        productName: row.name,
        direction: input.direction,
        quantity: input.quantity,
        reason: input.reason,
        stockBefore,
        stockAfter,
        unitCost,
        totalValue: unitCost === null ? null : Math.round(unitCost * input.quantity * 100) / 100,
      }
    }, TX_OPTIONS)
  }

  async correctCost(input: CorrectCostInput, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ name: string; buy_price: Prisma.Decimal | null }[]>`
        SELECT name, buy_price FROM products
        WHERE id = ${input.productId} AND is_active = true
        FOR UPDATE
      `
      if (locked.length !== 1) throw new StockError('Produk tidak ditemukan')

      const oldCost = locked[0].buy_price === null ? null : Number(locked[0].buy_price)
      if (oldCost !== null && Math.abs(oldCost - input.newCost) < 0.005) {
        throw new StockError('Modal baru sama dengan modal saat ini')
      }

      await tx.product.update({
        where: { id: input.productId },
        data: { buyPrice: input.newCost },
      })

      if (oldCost !== null) {
        await tx.priceHistory.create({
          data: {
            productId: input.productId,
            oldPrice: oldCost,
            newPrice: input.newCost,
            changedBy: userId,
            reason: input.reason,
          },
        })
      }

      return { productName: locked[0].name, oldCost, newCost: input.newCost }
    }, TX_OPTIONS)
  }
}