import { create } from 'zustand'
import { UserDto } from '@waregos/types'

interface AuthState {
  user: UserDto | null
  token: string | null
  setAuth: (user: UserDto, token: string) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem('waregos_token', token)
    localStorage.setItem('waregos_user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('waregos_token')
    localStorage.removeItem('waregos_user')
    set({ user: null, token: null })
  },

  hydrate: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('waregos_token')
    const userStr = localStorage.getItem('waregos_user')
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr) })
    }
  },
}))