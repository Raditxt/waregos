'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { api } from '@/lib/api'

const ADMIN_ONLY_ROUTES = ['/users', '/purchases', '/reports', '/audit']

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrate } = useAuthStore()
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showBanner, setShowBanner] = useState(false)

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
    if (user && user.role === 'CASHIER') {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(route =>
        pathname.startsWith(route)
      )
      if (isAdminRoute) router.push('/dashboard')
    }
  }, [user, router, pathname])

  // Health check saat mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        await api.get('/health'.replace('/api', ''))
        const wasOffline = sessionStorage.getItem('server_was_offline')
        if (wasOffline) {
          setShowBanner(true)
          sessionStorage.removeItem('server_was_offline')
          setTimeout(() => setShowBanner(false), 5000)
        }
        setServerStatus('online')
      } catch {
        setServerStatus('offline')
        sessionStorage.setItem('server_was_offline', 'true')
      }
    }
    checkServer()
  }, [])

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Confidence rebuild banner */}
        {showBanner && (
          <div className="bg-green-500 text-white px-4 py-2 text-sm flex items-center justify-between">
            <span>✅ Sistem kembali normal. Semua transaksi aman tersimpan.</span>
            <button onClick={() => setShowBanner(false)} className="ml-4 opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
        {/* Offline warning */}
        {serverStatus === 'offline' && (
          <div className="bg-red-500 text-white px-4 py-2 text-sm text-center">
            ⚠️ Server tidak dapat dijangkau. Periksa koneksi atau hubungi admin.
          </div>
        )}
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}