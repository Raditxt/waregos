// ============================================
// PRISMA TYPES — Type-safe Prisma results
// Eliminates 'any' across all service files
// ============================================

import { Prisma } from '@prisma/client'

// Product with relations
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true } }
    unit: { select: { id: true; name: true; symbol: true } }
  }
}>

// Transaction with relations
export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    user: { select: { name: true } }
    items: {
      include: {
        product: { select: { name: true } }
      }
    }
  }
}>

// Transaction item with product
export type TransactionItemWithProduct = Prisma.TransactionItemGetPayload<{
  include: {
    product: { select: { name: true; unit: { select: { symbol: true } } } }
  }
}>

// Purchase with relations
export type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: {
    supplier: { select: { name: true } }
    user: { select: { name: true } }
    items: {
      include: {
        product: { select: { name: true } }
      }
    }
  }
}>

// Activity log where clause
export type ActivityLogWhereInput = Prisma.ActivityLogWhereInput

// Stock movement with relations
export type StockMovementWithRelations = Prisma.StockMovementGetPayload<{
  include: {
    product: { select: { name: true } }
    user: { select: { name: true } }
  }
}>

// Transaction for reports
export type TransactionForReport = Prisma.TransactionGetPayload<{
  include: { items: true }
}>

// Transaction item for aggregation
export type TransactionItemForAggregation = Prisma.TransactionItemGetPayload<{
  include: {
    product: {
      select: {
        name: true
        unit: { select: { symbol: true } }
      }
    }
  }
}>