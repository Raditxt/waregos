import { z } from 'zod'

export const transactionItemSchema = z.object({
  productId: z.string().uuid({ message: 'Produk tidak valid' }),
  quantity: z.number().int().positive({ message: 'Jumlah harus lebih dari 0' }),
  sellPrice: z.number().positive({ message: 'Harga jual harus lebih dari 0' }),
})

export const createTransactionSchema = z.object({
  items: z.array(transactionItemSchema).min(1, { message: 'Transaksi harus memiliki minimal 1 item' }),
  // TRANSFER dibuang: sudah tidak dipakai. Enum database tetap menyimpannya untuk data lama.
  paymentMethod: z.enum(['CASH', 'QRIS', 'DEBT'], { message: 'Metode pembayaran tidak valid' }),
  paidAmount: z.number().min(0, { message: 'Jumlah bayar tidak boleh negatif' }),
  customerName: z.string().optional(),
  notes: z.string().optional(),
  // Dibuat klien per upaya checkout. Opsional supaya APK lama tetap jalan.
  idempotencyKey: z.string().uuid({ message: 'Kunci transaksi tidak valid' }).optional(),
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