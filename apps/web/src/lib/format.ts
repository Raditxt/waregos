// ============================================
// FORMAT UTILS — DRY Principle
// Reusable formatting functions
// ============================================

export const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)

export const formatNumber = (value: string): string => {
  const num = value.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const parseNumber = (value: string): string =>
  value.replace(/\./g, '')

export const formatDate = (
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', options ?? {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}