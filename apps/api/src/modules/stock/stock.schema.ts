import { z } from 'zod'

export const adjustStockSchema = z
  .object({
    productId: z.string().uuid(),
    direction: z.enum(['OUT', 'IN']).default('OUT'),
    quantity: z.number().int().positive().max(1_000_000),
    reason: z.enum(['EXPIRED', 'DAMAGED', 'LOST', 'CORRECTION']),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.direction === 'IN' && d.reason !== 'CORRECTION') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direction'],
        message: 'Menambah stok hanya untuk alasan koreksi',
      })
    }
    if ((d.reason === 'LOST' || d.reason === 'CORRECTION') && (!d.notes || d.notes.length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'Catatan wajib diisi (minimal 3 karakter) untuk barang hilang atau koreksi',
      })
    }
  })

export const correctCostSchema = z.object({
  productId: z.string().uuid(),
  newCost: z.number().positive().max(1_000_000_000),
  reason: z
    .string()
    .trim()
    .min(3, { message: 'Alasan koreksi wajib diisi (minimal 3 karakter)' })
    .max(200),
})

export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type CorrectCostInput = z.infer<typeof correctCostSchema>