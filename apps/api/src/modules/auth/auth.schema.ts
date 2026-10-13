import { z } from 'zod'

// Dipakai juga oleh users.route.ts
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { message: 'Username minimal 3 karakter' })
  .max(50, { message: 'Username maksimal 50 karakter' })
  .regex(/^[a-z0-9._-]+$/, {
    message: 'Username hanya boleh berisi huruf, angka, titik, garis bawah, dan strip',
  })

// Maks 72 karena bcrypt memotong diam-diam setelah 72 byte
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password minimal 8 karakter' })
  .max(72, { message: 'Password maksimal 72 karakter' })

// Login tidak menegakkan kebijakan password (itu urusan saat password dibuat)
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, { message: 'Username wajib diisi' }).max(50),
  password: z.string().min(1, { message: 'Password wajib diisi' }).max(128),
})

export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Password lama wajib diisi' }).max(128),
    newPassword: passwordSchema,
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Password baru harus berbeda dari yang lama',
    path: ['newPassword'],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>