// Satu sumber alamat API untuk seluruh web.
//
// NEXT_PUBLIC_API_URL ditanam saat build (static export), jadi harus dibaca dengan
// `process.env.NEXT_PUBLIC_API_URL` secara literal di sini. Nilainya adalah base URL
// REST API, diakhiri `/api` (mis. https://api.waregos.com/api).

const DEFAULT_API_URL = 'http://localhost:3001/api'

/** Base URL REST API, tanpa garis miring di akhir. Kosong = default dev. */
export function apiUrlFrom(raw: string | undefined): string {
  const value = raw?.trim() || DEFAULT_API_URL
  return value.replace(/\/+$/, '')
}

/**
 * Origin server API (tempat endpoint di luar /api, seperti /health).
 * Hanya akhiran `/api` yang dibuang, bukan kemunculan pertama `/api`,
 * supaya host `api.` tetap utuh.
 */
export function apiOriginFrom(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, '').replace(/\/api$/, '')
}

export const API_URL = apiUrlFrom(process.env.NEXT_PUBLIC_API_URL)
export const API_ORIGIN = apiOriginFrom(API_URL)
