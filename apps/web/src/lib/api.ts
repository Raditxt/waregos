import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
})

// Interceptor: tambahkan token ke setiap request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('waregos_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Peta error code → pesan Bahasa Indonesia
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Sesi kamu sudah habis. Silakan login kembali.',
  FORBIDDEN: 'Kamu tidak memiliki akses ke fitur ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  VALIDATION_ERROR: 'Data yang dimasukkan tidak valid.',
  INVALID_CREDENTIALS: 'Username atau password salah.',
  TOO_MANY_REQUESTS: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.',
  TRANSACTION_FAILED: 'Transaksi gagal diproses.',
  CANCEL_FAILED: 'Gagal membatalkan transaksi.',
  CHANGE_PASSWORD_FAILED: 'Gagal mengubah password.',
  RESET_FAILED: 'Gagal mereset password.',
  PURCHASE_FAILED: 'Gagal mencatat pembelian.',
  CONFLICT: 'Data sudah ada, gunakan nama/username yang berbeda.',
}

/**
 * Menerjemahkan error dari API atau error umum menjadi pesan dalam Bahasa Indonesia
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    const status = error.response?.status

    // Cek error code dari API
    if (data?.error && ERROR_MESSAGES[data.error]) {
      return ERROR_MESSAGES[data.error]
    }

    // Kalau ada message dari API, pakai itu
    if (data?.message) {
      return data.message
    }

    // Fallback berdasarkan HTTP status
    switch (status) {
      case 400: return 'Data yang dikirim tidak valid.'
      case 401: return 'Sesi kamu sudah habis. Silakan login kembali.'
      case 403: return 'Kamu tidak memiliki akses ke fitur ini.'
      case 404: return 'Data tidak ditemukan.'
      case 409: return 'Data sudah ada.'
      case 429: return 'Terlalu banyak permintaan. Coba lagi sebentar.'
      case 500: return 'Terjadi gangguan pada server. Coba lagi dalam beberapa detik.'
      case 503: return 'Server sedang tidak tersedia. Pastikan sistem berjalan.'
      default: return 'Terjadi kesalahan. Silakan coba lagi.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Terjadi kesalahan yang tidak diketahui.'
}

// Interceptor: tangani 401 secara global – redirect ke login dan tampilkan toast
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginEndpoint = error.config?.url?.includes('/auth/login')
      if (!isLoginEndpoint) {
        localStorage.removeItem('waregos_token')
        localStorage.removeItem('waregos_user')
        toast.error('Sesi kamu sudah habis. Silakan login kembali.')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)