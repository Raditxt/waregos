import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './products.schema';
import { ProductWithRelations } from '../../shared/prisma-types';
import { parsePagination, buildMeta } from '../../shared/pagination';
import { shopDateString } from '@waregos/utils';
import {
  Allocation,
  ExpiryStatus,
  PurchaseLine,
  allocateLayers,
  layerStatus,
  summarizeLayers,
} from '../../shared/expiry-layers';

export class ProductNotFoundError extends Error {
  constructor(message = 'Produk tidak ditemukan') {
    super(message);
    this.name = 'ProductNotFoundError';
  }
}

interface ExpiringRow {
  id: string;
  name: string;
  stock: number;
  unit: string;
  quantity: number; 
  expiryDate: string;
  daysLeft: number;
  status: ExpiryStatus;
}

export class ProductsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly role?: string
  ) {}

  async findAll(query: ProductQueryInput) {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.lowStock === 'true') {
      where.stock = { lte: this.prisma.product.fields.minStock };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const layers = await this.loadLayers(data);

    return {
      data: data.map((p) => this.formatProduct(p, layers.get(p.id))),
      meta: buildMeta(total, page, limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!product) return null;
    const layers = await this.loadLayers([product]);
    return this.formatProduct(product, layers.get(product.id));
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!product) return null;
    const layers = await this.loadLayers([product]);
    return this.formatProduct(product, layers.get(product.id));
  }

  async create(input: CreateProductInput) {
    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        categoryId: input.categoryId,
        unitId: input.unitId,
        buyPrice: input.buyPrice,
        sellPrice: input.sellPrice,
        stock: input.stock ?? 0,
        minStock: input.minStock ?? 5,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        expiryAlertDays: input.expiryAlertDays ?? 7,
      },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
    return this.formatProduct(product);
  }

  async update(id: string, input: UpdateProductInput) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new ProductNotFoundError();

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.barcode !== undefined && { barcode: input.barcode }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.unitId !== undefined && { unitId: input.unitId }),
        ...(input.sellPrice !== undefined && { sellPrice: input.sellPrice }),
        ...(input.minStock !== undefined && { minStock: input.minStock }),
        ...(input.expiryDate !== undefined && {
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        }),
        ...(input.expiryAlertDays !== undefined && {
          expiryAlertDays: input.expiryAlertDays,
        }),
      },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });

    return this.formatProduct(product);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ProductNotFoundError();

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: this.prisma.product.fields.minStock },
      },
      include: { unit: { select: { symbol: true } } },
      orderBy: { stock: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit.symbol,
    }));
  }

  async getExpiringSoon(): Promise<ExpiringRow[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      include: { unit: { select: { symbol: true } } },
    });

    const layers = await this.loadLayers(products);
    const today = shopDateString(new Date());
    const rows: ExpiringRow[] = [];

    for (const p of products) {
      const alertDays = p.expiryAlertDays ?? 7;
      const alloc = layers.get(p.id);
      const dated = alloc ? alloc.layers.some((l) => l.expiryDate !== null) : false;
      const base = { id: p.id, name: p.name, stock: p.stock, unit: p.unit.symbol };

      if (alloc && dated) {
        for (const l of summarizeLayers(alloc.layers, today, alertDays).layers) {
          if (l.expiryDate === null || l.status === null || l.status === 'ok') continue;
          rows.push({
            ...base,
            quantity: l.quantity,
            expiryDate: l.expiryDate,
            daysLeft: l.daysLeft ?? 0,
            status: l.status,
          });
        }
      } else if (p.expiryDate) {
        // Cadangan untuk data lama yang belum punya lapisan bertanggal
        const expiryDate = p.expiryDate.toISOString().slice(0, 10);
        const { status, daysLeft } = layerStatus(expiryDate, today, alertDays);
        if (status !== 'ok') rows.push({ ...base, quantity: p.stock, expiryDate, daysLeft, status });
      }
    }

    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async getDeadStock(dayThreshold = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        OR: [{ lastSoldAt: null }, { lastSoldAt: { lt: thresholdDate } }],
      },
      include: {
        unit: { select: { symbol: true } },
        category: { select: { name: true } },
      },
      orderBy: { lastSoldAt: 'asc' },
    });

    const now = new Date();
    return products.map((p) => {
      const daysSinceLastSold = p.lastSoldAt
        ? Math.floor(
            (now.getTime() - p.lastSoldAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      const buyPriceNum = p.buyPrice !== null ? Number(p.buyPrice) : null;

      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit.symbol,
        category: p.category?.name ?? null,
        buyPrice: buyPriceNum,
        stockValue: buyPriceNum !== null ? buyPriceNum * p.stock : null,
        lastSoldAt: p.lastSoldAt?.toISOString() ?? null,
        daysSinceLastSold,
        status:
          daysSinceLastSold === null
            ? 'never_sold'
            : daysSinceLastSold >= 60
              ? 'critical'
              : 'warning',
      };
    });
  }

  private async loadLayers(products: { id: string; stock: number }[]) {
    const result = new Map<string, Allocation>();
    const withStock = products.filter((p) => p.stock > 0);
    if (withStock.length === 0) return result;

    const lines = await this.prisma.purchaseItem.findMany({
      where: {
        productId: { in: withStock.map((p) => p.id) },
        purchase: { status: 'RECEIVED' },
      },
      orderBy: [
        { purchase: { purchasedAt: 'desc' } },
        { expiryDate: { sort: 'desc', nulls: 'last' } },
        { id: 'asc' },
      ],
      select: { productId: true, quantity: true, expiryDate: true },
    });

    const byProduct = new Map<string, PurchaseLine[]>();
    for (const l of lines) {
      const list = byProduct.get(l.productId) ?? [];
      list.push({
        quantity: l.quantity,
        expiryDate: l.expiryDate ? l.expiryDate.toISOString().slice(0, 10) : null,
      });
      byProduct.set(l.productId, list);
    }

    for (const p of withStock) {
      result.set(p.id, allocateLayers(p.stock, byProduct.get(p.id) ?? []));
    }
    return result;
  }

  private formatProduct(p: ProductWithRelations, alloc?: Allocation) {
    const alertDays = p.expiryAlertDays ?? 7;
    const summary = alloc
      ? summarizeLayers(alloc.layers, shopDateString(new Date()), alertDays)
      : null;
    const fromLayers = summary !== null && summary.nearestDate !== null;

    const expiryDate = fromLayers
      ? summary.nearestDate
      : p.expiryDate
        ? p.expiryDate.toISOString()
        : null;
    const expiryStatus = fromLayers
      ? summary.status
      : this.calculateExpiryStatus(p.expiryDate, p.expiryAlertDays);

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      unitId: p.unitId,
      unitName: p.unit.name,
      unitSymbol: p.unit.symbol,
      buyPrice:
        this.role === 'ADMIN'
          ? p.buyPrice !== null
            ? Number(p.buyPrice)
            : null
          : null,
      sellPrice: Number(p.sellPrice),
      stock: p.stock,
      minStock: p.minStock,
      expiryDate,
      expiryAlertDays: alertDays,
      expiryStatus,
      expiryLayers: summary ? summary.layers : [],
      expiredQuantity: summary ? summary.expiredQuantity : 0,
      expiringSoonQuantity: summary ? summary.expiringSoonQuantity : 0,
      untrackedQuantity: alloc ? alloc.untracked : p.stock,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private calculateExpiryStatus(
    expiryDate: Date | null,
    alertDays: number | null
  ): 'ok' | 'expiring_soon' | 'expired' | null {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const alertDate = new Date(expiry);
    alertDate.setDate(alertDate.getDate() - (alertDays ?? 7));

    if (now > expiry) return 'expired';
    if (now >= alertDate) return 'expiring_soon';
    return 'ok';
  }
}