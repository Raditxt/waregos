import { create } from 'zustand'
import { UserDto } from '@waregos/types'
import axios from 'axios'

interface AuthState {
  user: UserDto | null
  token: string | null
  isLoading: boolean
  error: string | null
  setAuth: (user: UserDto, token: string) => void
  logout: () => void
  hydrate: () => void
  login: (username: string, password: string) => Promise<boolean>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

const TOKEN_KEY = 'waregos_token'
const USER_KEY = 'waregos_user'

/* ============================================================
   HELPERS — aman di SSR (typeof window check)
   ============================================================ */
const persistAuth = (user: UserDto, token: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

const clearAuth = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/* ============================================================
   STORE
   ============================================================ */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setAuth: (user, token) => {
    persistAuth(user, token)
    set({ user, token })
  },

  logout: () => {
    clearAuth()
    set({ user: null, token: null, error: null })
  },

  hydrate: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    if (!token || !userStr) return

    try {
      const user = JSON.parse(userStr) as UserDto
      set({ token, user })
    } catch {
      clearAuth()
    }
  },

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      })
      const { accessToken, user } = res.data.data as {
        accessToken: string
        user: UserDto
      }

      persistAuth(user, accessToken)
      set({ user, token: accessToken, isLoading: false, error: null })
      return true
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Login gagal'
        : 'Terjadi kesalahan'
      set({ isLoading: false, error: message })
      return false
    }
  },
}))