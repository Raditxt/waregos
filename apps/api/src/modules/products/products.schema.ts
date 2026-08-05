import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, { message: 'Nama produk wajib diisi' }).max(100),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid({ message: 'Kategori tidak valid' }).optional(),
  unitId: z.string().uuid({ message: 'Satuan wajib dipilih' }),
  buyPrice: z.number().positive({ message: 'Harga beli harus lebih dari 0' }),
  sellPrice: z.number().positive({ message: 'Harga jual harus lebih dari 0' }),
  stock: z.number().int().min(0, { message: 'Stok tidak boleh negatif' }).default(0),
  minStock: z.number().int().min(0).default(5),
  expiryDate: z.string().datetime().optional(),
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