import { z } from 'zod'

export const categoryBodySchema = z.object(
  {
    name: z
      .string({ required_error: 'Nama kategori wajib diisi' })
      .trim()
      .min(1, { message: 'Nama kategori wajib diisi' })
      .max(50, { message: 'Nama kategori maksimal 50 karakter' }),
  },
  { required_error: 'Nama kategori wajib diisi' }
)

export type CategoryBodyInput = z.infer<typeof categoryBodySchema>