// ============================================
// INVOICE NUMBER GENERATOR
// ============================================
export function generateInvoiceNumber(prefix: 'TRX' | 'PRC'): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.getTime().toString().slice(-6)
  return prefix + '-' + date + '-' + time
}

// ============================================
// PAGINATION HELPER
// ============================================
export function getPaginationParams(query: { page?: string; limit?: string }) {
  const page = Math.max(1, parseInt(query.page ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

// ============================================
// DATE HELPERS
// ============================================
export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}