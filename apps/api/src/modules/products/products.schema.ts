import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, { message: 'Nama produk wajib diisi' }).max(100),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid({ message: 'Kategori tidak valid' }).optional(),
  unitId: z.string().uuid({ message: 'Satuan wajib dipilih' }),

  // FIX: buyPrice dibuat nullable + optional agar konsisten dengan ProductDto
  // (number | null) dan form yang memperlakukan field ini sebagai opsional.
  // - .nullable() → menerima null eksplisit dari client (mis. form mengirim null
  //   saat user sengaja mengosongkan field).
  // - .optional() → menerima undefined saat field tidak dikirim sama sekali.
  buyPrice: z
    .number()
    .positive({ message: 'Harga beli harus lebih dari 0' })
    .nullable()
    .optional(),

  sellPrice: z.number().positive({ message: 'Harga jual harus lebih dari 0' }),

  stock: z
    .number()
    .int()
    .min(0, { message: 'Stok tidak boleh negatif' })
    .default(0),

  minStock: z.number().int().min(0).default(5),

  // FIX: ganti .datetime() → .date() agar cocok dengan <input type="date">
  // yang mengirim "YYYY-MM-DD" (bukan ISO 8601 lengkap dengan waktu).
  expiryDate: z.string().date().optional(),

  expiryAlertDays: z.number().int().min(1).default(7).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const productQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  lowStock: z.string().optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>