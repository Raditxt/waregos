import { PrismaClient, Prisma, StockMovementType } from '@prisma/client';
import { CreatePurchaseInput, PurchaseQueryInput } from './purchases.schema';
import { generateInvoiceNumber, startOfDay, endOfDay } from '@waregos/utils';
import { PurchaseWithRelations } from '../../shared/prisma-types';
import { parseExpiry } from '../../shared/expiry';

export class PurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseError';
  }
}

const PURCHASE_INCLUDE = {
  supplier: { select: { name: true } },
  user: { select: { name: true } },
  items: {
    include: {
      product: { select: { name: true, unit: { select: { symbol: true } } } },
    },
  },
} satisfies Prisma.PurchaseInclude;

export class PurchasesService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreatePurchaseInput, userId: string) {
    const purchasedAt = this.resolvePurchasedAt(input);
    const lines = input.items.map((item, index) => ({
      index,
      productId: item.productId,
      quantity: item.quantity,
      buyPrice: item.buyPrice,
      expiry: item.expiryDate ? parseExpiry(item.expiryDate) : null,
    }));
    const productIds = [...new Set(lines.map((l) => l.productId))];

    const purchase = await this.prisma.$transaction(
      async (tx) => {
        const found = await tx.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true },
        });
        if (found.length !== productIds.length) {
          throw new PurchaseError('Satu atau lebih produk tidak ditemukan');
        }

        const supplierId = await this.resolveSupplierId(tx, input);
        const totalAmount = lines.reduce((sum, l) => sum + l.buyPrice * l.quantity, 0);

        const prc = await tx.purchase.create({
          data: {
            invoiceNumber: generateInvoiceNumber('PRC'),
            kind: input.kind,
            supplierId,
            supplierRef: input.supplierRef,
            userId,
            totalAmount,
            notes: input.notes,
            purchasedAt,
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                buyPrice: l.buyPrice,
                subtotal: l.buyPrice * l.quantity,
                expiryDate: l.expiry,
              })),
            },
          },
          include: PURCHASE_INCLUDE,
        });

        const ordered = [...lines].sort(
          (a, b) => a.productId.localeCompare(b.productId) || a.index - b.index
        );
        const movements: Prisma.StockMovementCreateManyInput[] = [];

        for (const line of ordered) {
          const rows = await tx.$queryRaw<{ stock: number }[]>`
            UPDATE products
            SET stock = stock + ${line.quantity}::int,
                buy_price = CASE
                  WHEN stock <= 0 OR buy_price IS NULL THEN ${line.buyPrice}::numeric
                  ELSE ROUND(
                    (stock * buy_price + ${line.quantity}::int * ${line.buyPrice}::numeric)
                    / (stock + ${line.quantity}::int), 2)
                END,
                updated_at = (NOW() AT TIME ZONE 'UTC')
            WHERE id = ${line.productId} AND is_active = true
            RETURNING stock
          `;
          if (rows.length !== 1) {
            throw new PurchaseError('Produk tidak ditemukan atau sudah dinonaktifkan');
          }

          const stockAfter = Number(rows[0].stock);
          movements.push({
            productId: line.productId,
            type: StockMovementType.PURCHASE_IN,
            quantity: line.quantity,
            stockBefore: stockAfter - line.quantity,
            stockAfter,
            unitCost: line.buyPrice,
            purchaseId: prc.id,
            userId,
          });
        }

        await tx.stockMovement.createMany({ data: movements });
        return prc;
      },
      { maxWait: 5000, timeout: 20000 }
    );

    return this.formatPurchase(purchase);
  }

  async findAll(query: PurchaseQueryInput) {
    const page = Math.max(1, parseInt(query.page ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {};
    if (query.kind) where.kind = query.kind;
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
        include: PURCHASE_INCLUDE,
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
      include: PURCHASE_INCLUDE,
    });
    if (!prc) return null;
    return this.formatPurchase(prc);
  }

  private resolvePurchasedAt(input: CreatePurchaseInput): Date {
    if (!input.purchasedAt) return new Date();
    const date = new Date(input.purchasedAt);
    if (date.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new PurchaseError('Tanggal pembelian tidak boleh di masa depan');
    }
    return date;
  }

  private async resolveSupplierId(
    tx: Prisma.TransactionClient,
    input: CreatePurchaseInput
  ): Promise<string | null> {
    if (input.supplierId) {
      const s = await tx.supplier.findUnique({
        where: { id: input.supplierId },
        select: { id: true },
      });
      if (!s) throw new PurchaseError('Supplier tidak ditemukan');
      return s.id;
    }
    if (!input.supplierName) return null;

    const name = input.supplierName.replace(/\s+/g, ' ').trim();
    const existing = await tx.supplier.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.supplier.create({ data: { name }, select: { id: true } });
    return created.id;
  }

  private formatPurchase(prc: PurchaseWithRelations) {
    return {
      id: prc.id,
      invoiceNumber: prc.invoiceNumber,
      kind: prc.kind,
      supplierId: prc.supplierId,
      supplierName: prc.supplier?.name ?? null,
      supplierRef: prc.supplierRef,
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
        unitSymbol: item.product.unit.symbol,
        quantity: item.quantity,
        buyPrice: Number(item.buyPrice),
        subtotal: Number(item.subtotal),
        expiryDate: item.expiryDate ? item.expiryDate.toISOString().slice(0, 10) : null,
      })),
    };
  }
}