// ============================================
// CATALOG SERVICE — Single Responsibility
// ============================================

import { PrismaClient } from '@prisma/client'

// Error "yang kita duga" (validasi bisnis). Error lain dibiarkan naik
// ke global error handler supaya tidak disamarkan jadi pesan menyesatkan.
export class CatalogError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 404 | 409 = 400
  ) {
    super(message)
    this.name = 'CatalogError'
  }
}

export class CatalogService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── CATEGORIES ─────────────────────────────────────────────
  async getCategories() {
    const rows = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        // hanya hitung produk aktif
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
      productCount: c._count.products,
    }))
  }

  async createCategory(name: string) {
    await this.assertCategoryNameFree(name)
    const c = await this.prisma.category.create({ data: { name } })
    return {
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
      productCount: 0,
    }
  }

  async updateCategory(id: string, name: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } })
    if (!existing) throw new CatalogError('Kategori tidak ditemukan', 404)

    await this.assertCategoryNameFree(name, id)

    const c = await this.prisma.category.update({ where: { id }, data: { name } })
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, isActive: true },
    })
    return {
      id: c.id,
      name: c.name,
      createdAt: c.createdAt.toISOString(),
      productCount,
    }
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } })
    if (!existing) throw new CatalogError('Kategori tidak ditemukan', 404)

    const activeCount = await this.prisma.product.count({
      where: { categoryId: id, isActive: true },
    })
    if (activeCount > 0) {
      throw new CatalogError(
        `Kategori "${existing.name}" masih dipakai ${activeCount} produk aktif. ` +
          `Hapus produknya dulu dari halaman Produk, baru kategorinya bisa dihapus.`,
        409
      )
    }

    // Lepas produk nonaktif yang masih menempel, lalu hapus kategori — satu transaksi
    await this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      this.prisma.category.delete({ where: { id } }),
    ])

    return { name: existing.name }
  }

  // Cek duplikat tanpa peduli huruf besar/kecil ("Minuman" == "minuman")
  private async assertCategoryNameFree(name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    })
    if (clash) {
      throw new CatalogError(`Kategori "${clash.name}" sudah ada.`, 409)
    }
  }

  // ─── UNITS ──────────────────────────────────────────────────
  async getUnits() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } })
  }

  async createUnit(name: string, symbol: string) {
    return this.prisma.unit.create({ data: { name, symbol } })
  }
}