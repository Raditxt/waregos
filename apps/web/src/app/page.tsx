'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

/* ============================================================
   SPLASH / ENTRY PAGE
   - Hydrate auth store
   - Tampilkan logo minimal 1.5 detik
   - Redirect ke /dashboard kalau sudah login, /login kalau belum
   ============================================================ */

const MIN_SPLASH_MS = 1500

export default function SplashPage() {
  const router = useRouter()
  const hydrate = useAuthStore((s) => s.hydrate)
  const hasRun = useRef(false)

  useEffect(() => {
    // Guard: React 18 StrictMode jalan 2x di dev — cukup sekali
    if (hasRun.current) return
    hasRun.current = true

    let cancelled = false

    const init = async () => {
      try {
        await hydrate()
      } catch (err) {
        console.error('[Splash] hydrate gagal:', err)
      }

      // Minimum splash duration supaya logo sempat terlihat
      await new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS))
      if (cancelled) return

      // Baca state terbaru langsung dari store (bukan dari closure)
      const { user } = useAuthStore.getState()
      router.replace(user ? '/dashboard' : '/login')
    }

    init()

    return () => {
      cancelled = true
    }
  }, [hydrate, router])

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
      }}
    >
      {/* Dekorasi blob halus di background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-40"
        style={{ background: '#fdba74' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30"
        style={{ background: '#fbbf24' }}
      />

      {/* Logo & nama brand */}
      <div className="relative flex flex-col items-center gap-6 animate-pulse">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
          >
            {/* SVG inline storefront */}
            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-14 h-14"
            >
              {/* Roof */}
              <path d="M8 26L32 12L56 26Z" fill="white" opacity="0.95" />
              {/* Body */}
              <rect
                x="14"
                y="26"
                width="36"
                height="26"
                rx="2"
                fill="white"
                opacity="0.95"
              />
              {/* Door */}
              <rect x="24" y="38" width="16" height="14" rx="2" fill="#f97316" />
              {/* Window left */}
              <rect
                x="16"
                y="29"
                width="10"
                height="8"
                rx="1.5"
                fill="#f97316"
                opacity="0.7"
              />
              {/* Window right */}
              <rect
                x="38"
                y="29"
                width="10"
                height="8"
                rx="1.5"
                fill="#f97316"
                opacity="0.7"
              />
              {/* Awning */}
              <rect
                x="10"
                y="23"
                width="44"
                height="5"
                rx="1"
                fill="white"
                opacity="0.6"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1
              className="text-4xl font-bold"
              style={{ color: '#c2410c', letterSpacing: '-0.02em' }}
            >
              Waregos
            </h1>
            <p className="text-sm mt-1" style={{ color: '#ea580c' }}>
              Toko Rabay Orange
            </p>
          </div>
        </div>
      </div>

      {/* Indikator loading */}
      <div
        className="absolute bottom-12 flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: '#f97316',
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
        <p className="text-xs" style={{ color: '#ea580c' }}>
          Memuat…
        </p>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          span[style*='bounce'] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}