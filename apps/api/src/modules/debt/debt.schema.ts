import { z } from 'zod'
import { MAX_TRANSACTION_ITEMS } from '@waregos/utils'

export const addDebtSchema = z.object({
  customerName: z.string().min(1, { message: 'Nama pelanggan wajib diisi' }),
  amount: z.number().positive({ message: 'Jumlah hutang harus lebih dari 0' }),
  // Rincian barang yang dihutang: batasnya sama dengan isi satu keranjang
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    )
    .max(MAX_TRANSACTION_ITEMS, {
      message: `Rincian hutang maksimal ${MAX_TRANSACTION_ITEMS} barang`,
    })
    .optional(),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  customerName: z.string().min(1),
  amount: z.number().positive({ message: 'Jumlah bayar harus lebih dari 0' }),
  notes: z.string().optional(),
})
