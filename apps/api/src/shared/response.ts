// ============================================
// RESPONSE HELPERS — Repository Pattern
// Consistent API response format
// ============================================

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface ApiPaginatedResponse<T> {
  success: true
  data: T[]
  meta: PaginationMeta
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// Success response factories
export const ok = <T>(data: T, message?: string): ApiSuccessResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
})

export const paginated = <T>(
  data: T[],
  meta: PaginationMeta
): ApiPaginatedResponse<T> => ({
  success: true,
  data,
  meta,
})

// Error response factories
export const badRequest = (message: string, error = 'BAD_REQUEST'): ApiErrorResponse => ({
  success: false,
  error,
  message,
})

export const notFound = (resource: string): ApiErrorResponse => ({
  success: false,
  error: 'NOT_FOUND',
  message: `${resource} tidak ditemukan`,
})

export const unauthorized = (): ApiErrorResponse => ({
  success: false,
  error: 'UNAUTHORIZED',
  message: 'Sesi kamu sudah habis. Silakan login kembali.',
})

export const forbidden = (): ApiErrorResponse => ({
  success: false,
  error: 'FORBIDDEN',
  message: 'Kamu tidak memiliki akses ke fitur ini.',
})

export const validationError = (message: string): ApiErrorResponse => ({
  success: false,
  error: 'VALIDATION_ERROR',
  message,
})

export const serverError = (): ApiErrorResponse => ({
  success: false,
  error: 'SERVER_ERROR',
  message: 'Terjadi gangguan pada server. Coba lagi dalam beberapa detik.',
})