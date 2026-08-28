// ============================================
// CATALOG SERVICE — Single Responsibility
// ============================================

import { PrismaClient } from '@prisma/client'

export class CatalogService {
  constructor(private readonly prisma: PrismaClient) {}

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } })
  }

  async getUnits() {
    return this.prisma.unit.findMany({ orderBy: { name: 'asc' } })
  }

  async createCategory(name: string) {
    return this.prisma.category.create({ data: { name } })
  }

  async createUnit(name: string, symbol: string) {
    return this.prisma.unit.create({ data: { name, symbol } })
  }
}