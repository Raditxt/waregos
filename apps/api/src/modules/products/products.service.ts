import { PrismaClient } from '@prisma/client'
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './products.schema'

export class ProductsService {
  constructor(private prisma: PrismaClient, private role?: string) {}

  // ─── FIND ALL ────────────────────────────────────────────────
  async findAll(query: ProductQueryInput, role?: string) {
    const page = Math.max(1, parseInt(query.page ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
    const skip = (page - 1) * limit

    const where: any = { isActive: true }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId
    }

    if (query.lowStock === 'true') {
      where.stock = { lte: this.prisma.product.fields.minStock }
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
    ])

    return {
      data: data.map((p) => this.formatProduct(p, role ?? this.role)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  // ─── FIND BY ID ──────────────────────────────────────────────
  async findById(id: string, role?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    })
    if (!product) return null
    return this.formatProduct(product, role ?? this.role)
  }

  // ─── FIND BY BARCODE ────────────────────────────────────────
  async findByBarcode(barcode: string, role?: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    })
    if (!product) return null
    return this.formatProduct(product, role ?? this.role)
  }

  // ─── CREATE PRODUCT ─────────────────────────────────────────
  async create(input: CreateProductInput, role?: string) {
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
    })
    return this.formatProduct(product, role ?? this.role)
  }

  // ─── UPDATE PRODUCT ─────────────────────────────────────────
  async update(id: string, input: UpdateProductInput, role?: string) {
    const data: any = {}

    if (input.name !== undefined) data.name = input.name
    if (input.sku !== undefined) data.sku = input.sku
    if (input.barcode !== undefined) data.barcode = input.barcode
    if (input.categoryId !== undefined) data.categoryId = input.categoryId
    if (input.unitId !== undefined) data.unitId = input.unitId
    if (input.buyPrice !== undefined) data.buyPrice = input.buyPrice
    if (input.sellPrice !== undefined) data.sellPrice = input.sellPrice
    if (input.stock !== undefined) data.stock = input.stock
    if (input.minStock !== undefined) data.minStock = input.minStock
    if (input.expiryDate !== undefined) {
      data.expiryDate = input.expiryDate ? new Date(input.expiryDate) : null
    }
    if (input.expiryAlertDays !== undefined) data.expiryAlertDays = input.expiryAlertDays

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    })
    return this.formatProduct(product, role ?? this.role)
  }

  // ─── SOFT DELETE ────────────────────────────────────────────
  async delete(id: string) {
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // ─── LOW STOCK REPORT ──────────────────────────────────────
  async getLowStock() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: this.prisma.product.fields.minStock as any },
      },
      include: {
        unit: { select: { symbol: true } },
      },
      orderBy: { stock: 'asc' },
    })
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      unit: p.unit.symbol,
    }))
  }

  // ─── EXPIRING SOON REPORT (baru) ───────────────────────────
  async getExpiringSoon() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        expiryDate: { not: null },
      },
      include: {
        unit: { select: { symbol: true } },
      },
      orderBy: { expiryDate: 'asc' },
    })

    const now = new Date()
    return products
      .map((p) => {
        const expiry = new Date(p.expiryDate!)
        const alertDate = new Date(expiry)
        alertDate.setDate(alertDate.getDate() - (p.expiryAlertDays ?? 7))
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        const status =
          now > expiry ? 'expired' : now >= alertDate ? 'expiring_soon' : 'ok'

        return {
          id: p.id,
          name: p.name,
          stock: p.stock,
          unit: p.unit.symbol,
          expiryDate: p.expiryDate!.toISOString(),
          daysLeft,
          status,
        }
      })
      .filter((p) => p.status !== 'ok') // hanya tampilkan yang expired atau expiring_soon
  }

  // ─── FORMAT RESPONSE ────────────────────────────────────────
  private formatProduct(p: any, role?: string) {
    let expiryStatus: 'ok' | 'expiring_soon' | 'expired' | null = null

    if (p.expiryDate) {
      const now = new Date()
      const expiry = new Date(p.expiryDate)
      const alertDate = new Date(expiry)
      alertDate.setDate(alertDate.getDate() - (p.expiryAlertDays ?? 7))

      if (now > expiry) {
        expiryStatus = 'expired'
      } else if (now >= alertDate) {
        expiryStatus = 'expiring_soon'
      } else {
        expiryStatus = 'ok'
      }
    }

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
      buyPrice: role === 'ADMIN' ? Number(p.buyPrice) : null,
      sellPrice: Number(p.sellPrice),
      stock: p.stock,
      minStock: p.minStock,
      expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
      expiryAlertDays: p.expiryAlertDays ?? 7,
      expiryStatus,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }
}