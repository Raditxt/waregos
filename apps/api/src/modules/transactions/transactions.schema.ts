import { z } from 'zod'

export const transactionItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive({ message: 'Quantity harus lebih dari 0' }),
  sellPrice: z.number().positive({ message: 'Harga jual harus lebih dari 0' }),
})

export const createTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1, { message: 'Transaksi harus memiliki minimal 1 item' }),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS']),
  paidAmount: z.number().positive({ message: 'Jumlah bayar harus lebih dari 0' }),
  notes: z.string().optional(),
})

export const transactionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['COMPLETED', 'CANCELLED', 'REFUNDED']).optional(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>