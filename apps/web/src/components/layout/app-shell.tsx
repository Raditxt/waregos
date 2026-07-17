'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from './sidebar'

// Halaman yang hanya bisa diakses ADMIN
const ADMIN_ONLY_ROUTES = ['/users', '/purchases', '/reports']

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('waregos_token')
    if (!token) {
      router.push('/login')
      return
    }

    // Cek role untuk halaman admin-only
    if (user && user.role === 'CASHIER') {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(route =>
        pathname.startsWith(route)
      )
      if (isAdminRoute) {
        router.push('/dashboard')
      }
    }
  }, [user, router, pathname])

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}