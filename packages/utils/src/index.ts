// ============================================
// ZONA WAKTU TOKO
// Batas "hari" dan "bulan" mengikuti jam toko (WITA, UTC+8, tanpa DST),
// bukan jam server. Hanya memakai aritmetika UTC, jadi hasilnya sama
// di server dengan zona waktu apa pun.
// ============================================
const SHOP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// Tanggal kalender di zona toko, format YYYY-MM-DD
export function shopDateString(date: Date): string {
  return new Date(date.getTime() + SHOP_UTC_OFFSET_MS).toISOString().slice(0, 10)
}

function shopParts(date: Date) {
  const [y, m, d] = shopDateString(date).split('-').map(Number)
  return { y, m, d }
}

export function startOfDay(date: Date): Date {
  const { y, m, d } = shopParts(date)
  return new Date(Date.UTC(y, m - 1, d) - SHOP_UTC_OFFSET_MS)
}

export function endOfDay(date: Date): Date {
  return new Date(startOfDay(date).getTime() + DAY_MS - 1)
}

export function startOfMonth(date: Date): Date {
  const { y, m } = shopParts(date)
  return new Date(Date.UTC(y, m - 1, 1) - SHOP_UTC_OFFSET_MS)
}

export function endOfMonth(date: Date): Date {
  const { y, m } = shopParts(date)
  return new Date(Date.UTC(y, m, 1) - SHOP_UTC_OFFSET_MS - 1)
}

// ============================================
// INVOICE NUMBER GENERATOR
// Format: TRX-20261011-3FA91C0D (tanggal WITA + 8 karakter acak).
// 8 hex = 4,3 miliar kemungkinan, jadi bentrok praktis mustahil.
// Kolom invoice_number tetap @unique sebagai pengaman terakhir.
// ============================================
export function generateInvoiceNumber(prefix: 'TRX' | 'PRC'): string {
  const date = shopDateString(new Date()).replace(/-/g, '')
  const suffix = Math.floor(Math.random() * 0x100000000)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0')
  return `${prefix}-${date}-${suffix}`
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