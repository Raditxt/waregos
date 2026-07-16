import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6)
})

export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, { message: 'Password baru minimal 6 karakter' }),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>