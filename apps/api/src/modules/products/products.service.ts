import { PrismaClient, Prisma } from '@prisma/client';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './products.schema';
import { ProductWithRelations } from '../../shared/prisma-types';
import { parsePagination, buildMeta } from '../../shared/pagination';

export class ProductsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly role?: string
  ) {}

  // ─── FIND ALL ────────────────────────────────────────────────
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
      // Filter low stock dilakukan setelah query karena Prisma tidak bisa membandingkan antar kolom secara langsung
      // where.stock = { lte: this.prisma.product.fields.minStock } // tidak valid
      // Kita akan ambil semua produk aktif lalu filter di JavaScript
      // Alternatif: gunakan query raw jika diperlukan performa tinggi
      // Untuk sekarang, kita gunakan pendekatan filter setelah fetch dengan batasan pagination
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

    // Filter low stock jika diminta
    const filteredData = query.lowStock === 'true'
      ? data.filter(p => p.stock <= p.minStock)
      : data;

    return {
      data: filteredData.map(p => this.formatProduct(p)),
      meta: buildMeta(total, page, limit),
    };
  }

  // ─── FIND BY ID ──────────────────────────────────────────────
  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!product) return null;
    return this.formatProduct(product);
  }

  // ─── FIND BY BARCODE ────────────────────────────────────────
  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!product) return null;
    return this.formatProduct(product);
  }

  // ─── CREATE PRODUCT ─────────────────────────────────────────
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

  // ─── UPDATE PRODUCT ─────────────────────────────────────────
  async update(id: string, input: UpdateProductInput, userId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new Error('Produk tidak ditemukan');

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.barcode !== undefined && { barcode: input.barcode }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.unitId !== undefined && { unitId: input.unitId }),
        ...(input.buyPrice !== undefined && { buyPrice: input.buyPrice }),
        ...(input.sellPrice !== undefined && { sellPrice: input.sellPrice }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.minStock !== undefined && { minStock: input.minStock }),
        ...(input.expiryDate !== undefined && {
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        }),
        ...(input.expiryAlertDays !== undefined && { expiryAlertDays: input.expiryAlertDays }),
      },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });

    // Catat price history jika harga beli berubah dan userId tersedia
    if (
      userId &&
      input.buyPrice !== undefined &&
      Number(input.buyPrice) !== Number(existing.buyPrice)
    ) {
      await this.prisma.priceHistory.create({
        data: {
          productId: id,
          oldPrice: existing.buyPrice,
          newPrice: input.buyPrice,
          changedBy: userId,
        },
      });
    }

    return this.formatProduct(product);
  }

  // ─── SOFT DELETE ────────────────────────────────────────────
  async delete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── LOW STOCK REPORT ──────────────────────────────────────
  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { unit: { select: { symbol: true } } },
      orderBy: { stock: 'asc' },
    });

    return products
      .filter(p => p.stock <= p.minStock)
      .map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        unit: p.unit.symbol,
      }));
  }

  // ─── EXPIRING SOON REPORT ──────────────────────────────────
  async getExpiringSoon() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, expiryDate: { not: null } },
      include: { unit: { select: { symbol: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    const now = new Date();
    return products
      .map(p => {
        const expiry = new Date(p.expiryDate!);
        const alertDate = new Date(expiry);
        alertDate.setDate(alertDate.getDate() - (p.expiryAlertDays ?? 7));
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const status = now > expiry ? 'expired' : now >= alertDate ? 'expiring_soon' : 'ok';
        return {
          id: p.id,
          name: p.name,
          stock: p.stock,
          unit: p.unit.symbol,
          expiryDate: p.expiryDate!.toISOString(),
          daysLeft,
          status,
        };
      })
      .filter(p => p.status !== 'ok');
  }

  // ─── DEAD STOCK REPORT ─────────────────────────────────────
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
    return products.map(p => {
      const daysSinceLastSold = p.lastSoldAt
        ? Math.floor((now.getTime() - p.lastSoldAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit.symbol,
        category: p.category?.name ?? null,
        buyPrice: Number(p.buyPrice),
        stockValue: Number(p.buyPrice) * p.stock,
        lastSoldAt: p.lastSoldAt?.toISOString() ?? null,
        daysSinceLastSold,
        status: daysSinceLastSold === null ? 'never_sold' : daysSinceLastSold >= 60 ? 'critical' : 'warning',
      };
    });
  }

  // ─── FORMAT RESPONSE ────────────────────────────────────────
  private formatProduct(p: ProductWithRelations) {
    const expiryStatus = this.calculateExpiryStatus(p.expiryDate, p.expiryAlertDays);

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
      buyPrice: this.role === 'ADMIN' ? Number(p.buyPrice) : null,
      sellPrice: Number(p.sellPrice),
      stock: p.stock,
      minStock: p.minStock,
      expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
      expiryAlertDays: p.expiryAlertDays ?? 7,
      expiryStatus,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  // ─── HELPER: EXPIRY STATUS ─────────────────────────────────
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