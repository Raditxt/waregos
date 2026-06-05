import { z } from 'zod'

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  buyPrice: z.number().positive(),
})

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  items: z.array(purchaseItemSchema).min(1),
  notes: z.string().optional(),
  purchasedAt: z.string().optional(),
})

export const purchaseQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>