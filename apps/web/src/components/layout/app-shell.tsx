'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { Menu, X } from 'lucide-react'

const ADMIN_ONLY_ROUTES = ['/users', '/purchases', '/reports', '/audit']

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, hydrate } = useAuthStore()

  // ── Desktop sidebar: pin + hover-expand ──
  const [pinned, setPinned] = useState(false)
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mobile ──
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // ── Server status ──
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [showBanner, setShowBanner] = useState(false)

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }, [])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Baca preferensi pin dari localStorage setelah mount
  useEffect(() => {
    const init = () => {
      const storedPinned = localStorage.getItem('waregos-sidebar-pinned') === 'true'
      setPinned(storedPinned)
      setMounted(true)
    }
    init()
  }, [])

  // Auth guard + pembatasan route khusus admin
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('waregos_token')
    if (!token) {
      router.push('/login')
      return
    }
    if (user?.role === 'CASHIER') {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))
      if (isAdminRoute) router.push('/dashboard')
    }
  }, [user, router, pathname])

  // Tutup mobile sidebar setiap kali pindah route
  useEffect(() => {
    const closeMobile = () => setMobileSidebarOpen(false)
    closeMobile()
  }, [pathname])

  // Health check server
  useEffect(() => {
    const checkServer = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001'
        await fetch(`${baseUrl}/health`)

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

  // Toggle pin: sidebar tetap terbuka walau mouse keluar
  const handleTogglePin = useCallback(() => {
    setPinned(prev => {
      const next = !prev
      localStorage.setItem('waregos-sidebar-pinned', String(next))
      if (!next) setIsHoverExpanded(false)
      return next
    })
  }, [])

  const handleSidebarMouseEnter = useCallback(() => {
    if (pinned) return
    clearHoverTimer()
    setIsHoverExpanded(true)
  }, [pinned, clearHoverTimer])

  const handleSidebarMouseLeave = useCallback(() => {
    if (pinned) return
    clearHoverTimer()
    hoverTimer.current = setTimeout(() => {
      setIsHoverExpanded(false)
      hoverTimer.current = null
    }, 180)
  }, [pinned, clearHoverTimer])

  // Keyboard accessibility: fokus masuk = expand, fokus keluar = collapse
  const handleSidebarFocus = useCallback(() => {
    if (pinned) return
    clearHoverTimer()
    setIsHoverExpanded(true)
  }, [pinned, clearHoverTimer])

  const handleSidebarBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (pinned) return
      if (e.currentTarget.contains(e.relatedTarget as Node)) return
      clearHoverTimer()
      setIsHoverExpanded(false)
    },
    [pinned, clearHoverTimer]
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      {/* ── Desktop Sidebar (hover-expand + pin) ── */}
      {mounted && (
        <div
          className="hidden lg:flex shrink-0"
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          onFocus={handleSidebarFocus}
          onBlur={handleSidebarBlur}
          style={{ position: 'relative', zIndex: 20 }}
        >
          <Sidebar
            pinned={pinned}
            onTogglePin={handleTogglePin}
            isHoverExpanded={isHoverExpanded}
          />
        </div>
      )}

      {/* Fallback sebelum mounted — cegah layout jump saat hydration */}
      {!mounted && (
        <div className="hidden lg:block shrink-0" aria-hidden="true" />
      )}

      {/* ── Mobile Overlay ── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div
        className="fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300"
        style={{
          transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <Sidebar
          pinned={true}
          onTogglePin={() => setMobileSidebarOpen(false)}
          isHoverExpanded={false}
        />
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header
          className="flex lg:hidden items-center gap-3 px-4 py-3 sticky top-0 z-30"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand — SVG storefront */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
            >
              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '16px', height: '16px' }}
              >
                <path d="M8 26L32 12L56 26Z" fill="white" opacity="0.95" />
                <rect x="14" y="26" width="36" height="26" rx="2" fill="white" opacity="0.95" />
                <rect x="24" y="38" width="16" height="14" rx="2" fill="#f97316" />
                <rect x="16" y="29" width="10" height="8" rx="1.5" fill="#f97316" opacity="0.7" />
                <rect x="38" y="29" width="10" height="8" rx="1.5" fill="#f97316" opacity="0.7" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                Waregos
              </span>
              <span className="text-xs ml-1.5" style={{ color: 'var(--muted-foreground)' }}>
                Toko Rabay Orange
              </span>
            </div>
          </div>
        </header>

        {/* Banners */}
        {showBanner && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            style={{ background: '#22c55e', color: '#ffffff' }}
          >
            <span>✅ Sistem kembali normal. Semua transaksi aman tersimpan.</span>
            <button onClick={() => setShowBanner(false)} aria-label="Tutup notifikasi">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {serverStatus === 'offline' && (
          <div
            className="px-4 py-2.5 text-sm text-center"
            style={{ background: '#ef4444', color: '#ffffff' }}
          >
            ⚠️ Server tidak dapat dijangkau. Periksa koneksi atau hubungi admin.
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}