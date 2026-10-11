import { PrismaClient, Prisma } from '@prisma/client';
import { StockMovementType } from '@prisma/client';
import { CreatePurchaseInput, PurchaseQueryInput } from './purchases.schema';
import { generateInvoiceNumber, startOfDay, endOfDay } from '@waregos/utils';
import { PurchaseWithRelations } from '../../shared/prisma-types';

export class PurchasesService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePurchaseInput, userId: string) {
    const productIds = input.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new Error('Produk yang sama tidak boleh muncul dua kali dalam satu pembelian');
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });
      if (products.length !== productIds.length) {
        throw new Error('Satu atau lebih produk tidak ditemukan');
      }
      const productMap = new Map(products.map((p) => [p.id, p] as const));

      const totalAmount = input.items.reduce((sum, i) => sum + i.buyPrice * i.quantity, 0);

      const prc = await tx.purchase.create({
        data: {
          invoiceNumber: generateInvoiceNumber('PRC'),
          supplierId: input.supplierId,
          userId,
          totalAmount,
          notes: input.notes,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : new Date(),
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              buyPrice: item.buyPrice,
              subtotal: item.buyPrice * item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { name: true } } } },
          supplier: { select: { name: true } },
          user: { select: { name: true } },
        },
      });

      const ordered = [...input.items].sort((a, b) => a.productId.localeCompare(b.productId));
      const movements: Prisma.StockMovementCreateManyInput[] = [];
      const histories: Prisma.PriceHistoryCreateManyInput[] = [];

      for (const item of ordered) {
        const before = productMap.get(item.productId)!;

        // Penambahan dihitung di database, bukan dari hasil bacaan lama
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity }, buyPrice: item.buyPrice },
          select: { stock: true },
        });

        movements.push({
          productId: item.productId,
          type: StockMovementType.PURCHASE_IN,
          quantity: item.quantity,
          stockBefore: updated.stock - item.quantity,
          stockAfter: updated.stock,
          purchaseId: prc.id,
          userId,
        });

        if (before.buyPrice !== null && Number(before.buyPrice) !== item.buyPrice) {
          histories.push({
            productId: item.productId,
            oldPrice: before.buyPrice,
            newPrice: item.buyPrice,
            changedBy: userId,
          });
        }
      }

      await tx.stockMovement.createMany({ data: movements });
      if (histories.length > 0) {
        await tx.priceHistory.createMany({ data: histories });
      }

      return prc;
    }, { maxWait: 5000, timeout: 20000 });

    return this.formatPurchase(purchase);
  }

  async findAll(query: PurchaseQueryInput) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {};
    if (query.dateFrom || query.dateTo) {
      where.purchasedAt = {};
      if (query.dateFrom) where.purchasedAt.gte = startOfDay(new Date(query.dateFrom));
      if (query.dateTo) where.purchasedAt.lte = endOfDay(new Date(query.dateTo));
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
            include: { product: { select: { name: true } } },
          },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: data.map((prc) => this.formatPurchase(prc)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const prc = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    if (!prc) return null;
    return this.formatPurchase(prc);
  }

  private formatPurchase(prc: PurchaseWithRelations) {
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
      items: prc.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }
}