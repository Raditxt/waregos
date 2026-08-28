// ============================================
// PAGINATION — DRY Principle
// Reusable pagination logic
// ============================================

export interface PaginationParams {
  page?: string
  limit?: string
}

export interface PaginationResult {
  page: number
  limit: number
  skip: number
}

export const parsePagination = (
  params: PaginationParams,
  maxLimit = 100
): PaginationResult => {
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const limit = Math.min(maxLimit, Math.max(1, parseInt(params.limit ?? '20')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export const buildMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
})