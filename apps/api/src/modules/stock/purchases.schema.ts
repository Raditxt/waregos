import { z } from 'zod'
import { parseExpiry } from '../../shared/expiry'

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(1_000_000),
  buyPrice: z.number().positive().max(1_000_000_000),
  expiryDate: z
    .string()
    .refine((v) => parseExpiry(v) !== null, {
      message: 'Kedaluwarsa harus berformat YYYY-MM atau YYYY-MM-DD yang valid',
    })
    .optional(),
})

export const createPurchaseSchema = z
  .object({
    kind: z.enum(['PURCHASE', 'OPENING']).default('PURCHASE'),
    supplierId: z.string().uuid().optional(),
    supplierName: z.string().trim().min(1).max(100).optional(),
    supplierRef: z.string().trim().min(1).max(50).optional(),
    items: z.array(purchaseItemSchema).min(1).max(200),
    notes: z.string().trim().max(500).optional(),
    purchasedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine(
    (d) =>
      d.kind !== 'OPENING' ||
      (!d.supplierId && !d.supplierName && !d.supplierRef && !d.purchasedAt),
    {
      message: 'Saldo awal tidak memakai supplier, nomor nota, atau tanggal pembelian',
      path: ['kind'],
    }
  )

export const purchaseQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  kind: z.enum(['PURCHASE', 'OPENING']).optional(),
})

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>